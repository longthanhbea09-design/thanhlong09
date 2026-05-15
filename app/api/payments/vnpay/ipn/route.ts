/**
 * GET /api/payments/vnpay/ipn
 *
 * VNPay IPN (Instant Payment Notification) handler.
 * VNPay calls this URL with query params after each payment.
 *
 * Security:
 *   1. HMAC-SHA512 signature verified before any DB writes.
 *   2. Amount verified against stored order.amount (VNPay sends amount * 100).
 *   3. Idempotent: duplicate transactionId is ignored.
 *   4. Order expiry checked.
 *   5. Never log secret key.
 *
 * VNPay expects specific JSON response codes:
 *   "00" = Confirm Success
 *   "97" = Checksum failed
 *   "02" = Order already confirmed
 *   "04" = Invalid amount
 *   "01" = Order not found
 */
import { NextRequest, NextResponse } from 'next/server'
import { VnpayProvider } from '@/lib/payment/vnpay'
import { processPaymentWebhook } from '@/lib/payment/handleWebhookPayment'
import { securityLog } from '@/lib/securityLog'
import { getClientIp } from '@/lib/rateLimit'

const provider = new VnpayProvider()

function vnpResponse(code: string, message: string) {
  return NextResponse.json({ RspCode: code, Message: message })
}

export async function GET(request: NextRequest) {
  const ip = getClientIp(request)
  const { searchParams } = new URL(request.url)

  // Convert URLSearchParams to plain object for verification
  const params: Record<string, string> = {}
  searchParams.forEach((val, key) => { params[key] = val })

  // 1. Verify HMAC-SHA512 signature
  const verified = provider.verifyWebhook(params)
  if (!verified.valid) {
    securityLog('WEBHOOK_SIGNATURE_INVALID', {
      ip,
      provider: 'VNPAY',
      path: '/api/payments/vnpay/ipn',
    })
    return vnpResponse('97', 'Checksum failed')
  }

  const responseCode = params.vnp_ResponseCode
  const transactionStatus = params.vnp_TransactionStatus

  // 2. Payment failed or cancelled by customer — just confirm receipt
  if (responseCode !== '00' || transactionStatus !== '00') {
    console.info(`[vnpay-ipn] responseCode=${responseCode} txnRef=${params.vnp_TxnRef} — not success`)
    return vnpResponse('00', 'Confirm Success')
  }

  const { orderCode, amount, transactionId, description } = verified
  if (!orderCode || !amount || !transactionId) {
    return vnpResponse('01', 'Order not found')
  }

  try {
    const { ok, message } = await processPaymentWebhook({
      orderCode,
      amount,
      transactionId,
      description: description ?? '',
      provider: 'VNPAY',
      rawPayload: JSON.stringify(params),
    })

    if (!ok) {
      console.warn(`[vnpay-ipn] ${message} — orderCode=${orderCode}`)
      if (message === 'Already paid') return vnpResponse('02', 'Order already confirmed')
      if (message === 'Order not found') return vnpResponse('01', 'Order not found')
      if (message.startsWith('Underpaid')) return vnpResponse('04', 'Invalid amount')
    }

    return vnpResponse('00', 'Confirm Success')
  } catch (err) {
    console.error('[vnpay-ipn] error:', err instanceof Error ? err.message : err)
    return vnpResponse('99', 'Unknown error')
  }
}

// VNPay may also POST in some configurations
export const POST = GET
