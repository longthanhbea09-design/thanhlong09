/**
 * POST /api/payments/sepay/webhook
 *
 * SePay calls this URL on every bank transaction detected on the linked MB Bank account.
 *
 * Security: Authorization header must match "Apikey <key>" (key from DB or SEPAY_API_KEY env).
 * Logging: every request is saved to WebhookLog collection for admin visibility.
 */
import { NextRequest, NextResponse } from 'next/server'
import { checkSePayAuth, parseSePayPayload } from '@/lib/payment/sepay'
import { getPaymentSettings, getSePayApiKey } from '@/lib/payments/payment-settings'
import { processPaymentWebhook } from '@/lib/payment/handleWebhookPayment'
import { securityLog } from '@/lib/securityLog'
import { getClientIp } from '@/lib/rateLimit'
import { prisma } from '@/lib/prisma'

const OK = NextResponse.json({ success: true }, { status: 200 })
const UNAUTHORIZED = NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

async function saveWebhookLog(data: {
  ip: string
  authHeader: string
  rawBody: string
  orderCode?: string
  amount?: number
  txId?: string
  status: string
  message?: string
}) {
  try {
    await prisma.webhookLog.create({
      data: {
        provider: 'SEPAY',
        ip: data.ip,
        authHeader: data.authHeader,
        rawBody: data.rawBody.slice(0, 4000), // cap at 4KB
        orderCode: data.orderCode,
        amount: data.amount,
        txId: data.txId,
        status: data.status,
        message: data.message?.slice(0, 500),
      },
    })
  } catch (err) {
    // never let logging failure break the response
    console.error('[sepay-webhook] WebhookLog save failed:', err instanceof Error ? err.message : err)
  }
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const authHeader = request.headers.get('authorization')
  const authHeaderPresent = authHeader ? 'present' : 'absent'

  // ── Raw entry log (always first — shows up even if everything else fails) ──
  console.log('===== SEPAY WEBHOOK RECEIVED =====')
  console.log('URL:', request.url)
  console.log('Authorization header:', authHeaderPresent)
  console.log('IP:', ip)

  // Read body as text first so we can log it before parsing
  let rawBody = ''
  try {
    rawBody = await request.text()
  } catch {
    console.warn('[WEBHOOK_RECEIVED] failed to read body')
    return OK
  }
  console.log('Body:', rawBody)
  console.log('[WEBHOOK_RECEIVED] provider=SEPAY ip=' + ip)

  // ── Step 1: Auth ──────────────────────────────────────────────────────────
  const settings = await getPaymentSettings()
  const apiKey = await getSePayApiKey(settings)

  if (!checkSePayAuth(authHeader, apiKey)) {
    let reason: string
    if (!apiKey) {
      reason = 'no_api_key_configured'
    } else if (!authHeader) {
      reason = 'no_authorization_header'
    } else {
      reason = 'wrong_api_key'
    }
    console.warn(`[INVALID_API_KEY] reason=${reason} header_present=${!!authHeader}`)
    securityLog('WEBHOOK_SIGNATURE_INVALID', {
      ip,
      provider: 'SEPAY',
      path: '/api/payments/sepay/webhook',
      reason,
    })
    await saveWebhookLog({ ip, authHeader: authHeaderPresent, rawBody, status: 'AUTH_FAILED', message: reason })
    return UNAUTHORIZED
  }

  console.log('[API_KEY_VALID]')

  // ── Step 2: Parse JSON body ───────────────────────────────────────────────
  let payload: unknown
  try {
    payload = JSON.parse(rawBody)
  } catch {
    console.warn('[WEBHOOK_RECEIVED] JSON parse error — malformed body')
    await saveWebhookLog({ ip, authHeader: authHeaderPresent, rawBody, status: 'SKIP', message: 'JSON parse error' })
    return OK
  }

  // Log all SePay fields for production debugging
  const p = payload as Record<string, unknown>
  console.log('[sepay-webhook] full payload:', JSON.stringify({
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
    console.log(`[SKIP] ${parsed.skipReason}`)
    await saveWebhookLog({ ip, authHeader: authHeaderPresent, rawBody, status: 'SKIP', message: parsed.skipReason })
    return OK
  }

  const { orderCode, amount, transactionId: txId, referenceCode } = parsed

  if (!orderCode || !amount || !txId) {
    const msg = `missing fields: orderCode=${orderCode} amount=${amount} txId=${txId}`
    console.warn('[SKIP]', msg)
    await saveWebhookLog({ ip, authHeader: authHeaderPresent, rawBody, status: 'SKIP', message: msg })
    return OK
  }

  console.log(`[ORDER_CODE_EXTRACTED] orderCode=${orderCode} amount=${amount} txId=${txId}`)

  // ── Step 4: Process payment ───────────────────────────────────────────────
  let finalStatus = 'ERROR'
  let finalMessage = ''
  try {
    const { ok, message, status: processStatus } = await processPaymentWebhook({
      orderCode,
      amount,
      transactionId: txId,
      description: referenceCode ?? '',
      provider: 'SEPAY_MBBANK',
      rawPayload: rawBody,
    })

    finalStatus = processStatus ?? (ok ? 'PAID' : 'ERROR')
    finalMessage = message

    if (ok) {
      console.log(`[sepay-webhook] SUCCESS — ${message}`)
    } else {
      console.warn(`[sepay-webhook] REJECTED — ${message}`)
    }
  } catch (err) {
    finalMessage = err instanceof Error ? err.message : String(err)
    console.error('[sepay-webhook] INTERNAL ERROR:', err instanceof Error ? err.stack : err)
  }

  await saveWebhookLog({
    ip,
    authHeader: authHeaderPresent,
    rawBody,
    orderCode,
    amount,
    txId,
    status: finalStatus,
    message: finalMessage,
  })

  return OK
}
