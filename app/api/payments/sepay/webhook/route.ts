/**
 * POST /api/payments/sepay/webhook
 *
 * SePay calls this URL on every bank transaction detected on the linked MB Bank account.
 *
 * Security model:
 *   1. Authorization header checked FIRST — returns 401 immediately on mismatch.
 *      API key loaded from encrypted DB value → SEPAY_API_KEY env var (priority order).
 *   2. Only transferType="in" is processed — "out" events are acknowledged with 200.
 *   3. OrderCode extracted from content/code/description (TLS-YYYYMMDD-XXXX format).
 *   4. Amount verified against order.amount (stored server-side at order creation).
 *   5. Dedup via SePay transaction id — duplicate webhooks return 200 without re-processing.
 *   6. Account delivery done inside a DB transaction — no double-sell possible.
 *   7. API key is never logged.
 *
 * Response contract:
 *   401 — bad/missing Authorization header (the only non-200 response)
 *   200 — everything else (auth ok, including skips and processing errors)
 *
 * Returning 200 for processing errors prevents infinite SePay retries on our own faults.
 * Returning 401 for bad auth is intentional — it signals misconfiguration to the operator.
 */
import { NextRequest, NextResponse } from 'next/server'
import { checkSePayAuth, parseSePayPayload } from '@/lib/payment/sepay'
import { getPaymentSettings, getSePayApiKey } from '@/lib/payments/payment-settings'
import { processPaymentWebhook } from '@/lib/payment/handleWebhookPayment'
import { securityLog } from '@/lib/securityLog'
import { getClientIp } from '@/lib/rateLimit'

const OK = NextResponse.json({ success: true }, { status: 200 })
const UNAUTHORIZED = NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const authHeader = request.headers.get('authorization')

  // ── Step 1: Auth ─────────────────────────────────────────────────────────
  const settings = await getPaymentSettings()
  const apiKey = await getSePayApiKey(settings)

  // Diagnose auth failure reason without logging the key itself
  if (!checkSePayAuth(authHeader, apiKey)) {
    let authFailReason: string
    if (!apiKey) {
      authFailReason = 'no_api_key_configured (set SEPAY_API_KEY env or save via Admin → Thanh toán)'
    } else if (!authHeader) {
      authFailReason = 'no_authorization_header'
    } else {
      authFailReason = 'wrong_api_key (header present but does not match)'
    }
    console.warn(
      `[sepay-webhook] AUTH FAILED — ip=${ip} reason=${authFailReason} header_present=${!!authHeader}`
    )
    securityLog('WEBHOOK_SIGNATURE_INVALID', {
      ip,
      provider: 'SEPAY',
      path: '/api/payments/sepay/webhook',
      reason: authFailReason,
    })
    return UNAUTHORIZED
  }

  console.info(`[sepay-webhook] AUTH OK — ip=${ip}`)

  // ── Step 2: Parse body ────────────────────────────────────────────────────
  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    console.warn('[sepay-webhook] JSON parse error — malformed body')
    return OK
  }

  // Log all key fields for debugging in Vercel Logs
  const p = payload as Record<string, unknown>
  console.info('[sepay-webhook] payload received:', JSON.stringify({
    id: p.id,
    gateway: p.gateway,
    transactionDate: p.transactionDate,
    accountNumber: p.accountNumber,
    transferType: p.transferType,
    transferAmount: p.transferAmount,
    content: p.content,
    description: p.description,
    code: p.code,
    referenceCode: p.referenceCode,
  }))

  // ── Step 3: Extract orderCode ─────────────────────────────────────────────
  const parsed = parseSePayPayload(payload)

  if (!parsed.ok) {
    console.info(`[sepay-webhook] SKIPPED — ${parsed.skipReason}`)
    return OK
  }

  const { orderCode, amount, transactionId, referenceCode } = parsed

  if (!orderCode || !amount || !transactionId) {
    console.warn(`[sepay-webhook] SKIPPED — missing fields after parse: orderCode=${orderCode} amount=${amount} txId=${transactionId}`)
    return OK
  }

  console.info(
    `[sepay-webhook] extracted — orderCode=${orderCode} amount=${amount} txId=${transactionId} refCode=${referenceCode ?? 'none'}`
  )

  // ── Step 4: Process payment ───────────────────────────────────────────────
  try {
    const { ok, message } = await processPaymentWebhook({
      orderCode,
      amount,
      transactionId,
      description: referenceCode ?? '',
      provider: 'SEPAY_MBBANK',
      rawPayload: JSON.stringify(payload),
    })

    if (ok) {
      console.info(`[sepay-webhook] SUCCESS — ${message} orderCode=${orderCode} amount=${amount}`)
    } else {
      // Business-level rejection — log clearly so it shows in Vercel Logs
      console.warn(`[sepay-webhook] REJECTED — ${message} orderCode=${orderCode} amount=${amount}`)
    }
  } catch (err) {
    // Internal error — log full detail but still return 200 to prevent SePay retry storm
    console.error('[sepay-webhook] INTERNAL ERROR:', err instanceof Error ? err.stack : err)
  }

  return OK
}
