/**
 * POST /api/payments/momo/ipn
 *
 * MoMo IPN handler — called by MoMo on every payment event (success or failure).
 *
 * Security:
 *   1. HMAC-SHA256 verified using secret from DB (or MOMO_SECRET_KEY env fallback).
 *   2. Amount verified against order.amount in processPaymentWebhook().
 *   3. Idempotent — duplicate transId is ignored.
 *   4. resultCode 0 = success; anything else is acknowledged without processing.
 *   5. Secret key is never logged.
 *
 * MoMo expects: { status: 0, message: "Received" } on all 200 responses.
 */
import { NextRequest, NextResponse } from 'next/server'
import { verifyMomoIpn } from '@/lib/payments/momo-service'
import { getPaymentSettings, getMomoSecretKey } from '@/lib/payments/payment-settings'
import { processPaymentWebhook } from '@/lib/payment/handleWebhookPayment'
import { securityLog } from '@/lib/securityLog'
import { getClientIp } from '@/lib/rateLimit'

const ACK_OK = { status: 0, message: 'Received' }
const ACK_ERR = { status: 1, message: 'Failed' }

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json(ACK_ERR, { status: 400 })
  }

  // Read secret from DB (encrypted) with env fallback — never log this value
  const settings = await getPaymentSettings()
  const secretKey = await getMomoSecretKey(settings)
  const accessKey = settings.momoAccessKey || process.env.MOMO_ACCESS_KEY || ''

  // 1. Verify HMAC-SHA256 signature
  const verified = verifyMomoIpn(payload, secretKey, accessKey)
  if (!verified.valid) {
    securityLog('WEBHOOK_SIGNATURE_INVALID', {
      ip,
      provider: 'MOMO',
      path: '/api/payments/momo/ipn',
    })
    return NextResponse.json(ACK_ERR)
  }

  const resultCode = verified.resultCode ?? -1

  // 2. Non-success (cancelled, failed, etc.) — acknowledge without processing
  if (resultCode !== 0) {
    console.info(`[momo-ipn] resultCode=${resultCode} orderId=${verified.orderCode} — skipped`)
    return NextResponse.json(ACK_OK)
  }

  // 3. Process successful payment
  const { orderCode, amount, transactionId } = verified
  if (!orderCode || !amount || !transactionId) {
    return NextResponse.json(ACK_ERR)
  }

  try {
    const { ok, message } = await processPaymentWebhook({
      orderCode,
      amount,
      transactionId,
      description: '',
      provider: 'MOMO',
      rawPayload: JSON.stringify(payload),
    })

    if (!ok) {
      console.warn(`[momo-ipn] processPaymentWebhook: ${message} orderId=${orderCode}`)
    }

    return NextResponse.json(ACK_OK)
  } catch (err) {
    console.error('[momo-ipn] error:', err instanceof Error ? err.message : err)
    return NextResponse.json(ACK_ERR)
  }
}
