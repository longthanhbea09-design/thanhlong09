/**
 * POST /api/payments/sepay/webhook
 *
 * SePay calls this URL on every bank transaction detected on the linked MB Bank account.
 *
 * Security model:
 *   1. Authorization header checked FIRST — returns 401 immediately on mismatch.
 *      API key loaded from SEPAY_API_KEY env (or encrypted DB value, same priority order).
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
 *         body: { success: true }
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

  // ── Step 1: Auth — load key server-side, never from client ───────────────
  // Priority: encrypted value in PaymentSettings DB → SEPAY_API_KEY env var
  const settings = await getPaymentSettings()
  const apiKey = await getSePayApiKey(settings)

  if (!checkSePayAuth(authHeader, apiKey)) {
    securityLog('WEBHOOK_SIGNATURE_INVALID', {
      ip,
      provider: 'SEPAY',
      path: '/api/payments/sepay/webhook',
    })
    return UNAUTHORIZED
  }

  // ── Step 2: Parse body ────────────────────────────────────────────────────
  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return OK // malformed JSON — auth was valid, so acknowledge and move on
  }

  const parsed = parseSePayPayload(payload)

  if (!parsed.ok) {
    // Benign skip: "out" transfer, no orderCode in content, etc.
    console.info(`[sepay-webhook] skipped — ${parsed.skipReason}`)
    return OK
  }

  const { orderCode, amount, transactionId, referenceCode } = parsed

  if (!orderCode || !amount || !transactionId) {
    return OK
  }

  // ── Step 3: Process payment ───────────────────────────────────────────────
  // processPaymentWebhook handles: order lookup, amount check, dedup, PAID update, autoDelivery
  try {
    const { ok, message } = await processPaymentWebhook({
      orderCode,
      amount,
      transactionId,
      description: referenceCode ?? '',
      provider: 'SEPAY_MBBANK',
      rawPayload: JSON.stringify(payload),
    })

    if (!ok) {
      // Log business-level rejections (already paid, underpaid, expired, etc.)
      console.info(`[sepay-webhook] ${message} — orderCode=${orderCode}`)
    }
  } catch (err) {
    // Internal error — log but still return 200 to avoid SePay retry storm
    console.error('[sepay-webhook] error:', err instanceof Error ? err.message : err)
  }

  return OK
}
