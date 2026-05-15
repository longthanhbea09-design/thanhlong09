import { createHmac } from 'crypto'
import type { CreatePaymentParams, PaymentLinkResult, PaymentProvider, WebhookVerifyResult } from './types'

function hmac512(data: string, key: string): string {
  return createHmac('sha512', key).update(Buffer.from(data, 'utf-8')).digest('hex')
}

/**
 * Build sorted "key=value&..." string from params, without URL-encoding values.
 * VNPay's signature spec requires raw values (not double-encoded).
 */
function sortedRawString(params: Record<string, string>): string {
  return Object.keys(params)
    .sort()
    .map(k => `${k}=${params[k]}`)
    .join('&')
}

/**
 * Build URL query string with properly URL-encoded values (for the actual redirect URL).
 */
function sortedUrlEncoded(params: Record<string, string>): string {
  return Object.keys(params)
    .sort()
    .map(k => `${k}=${encodeURIComponent(params[k])}`)
    .join('&')
}

function toVnpDate(d: Date): string {
  const pad = (n: number, l = 2) => String(n).padStart(l, '0')
  return (
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
    `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  )
}

/**
 * VNPay Payment Provider — API v2.1.0.
 *
 * Env vars required:
 *   VNPAY_TMN_CODE      — terminal code from VNPay merchant portal
 *   VNPAY_HASH_SECRET   — hash secret (used for HMAC-SHA512 — never log)
 *   VNPAY_PAYMENT_URL   — VNPay payment gateway URL
 *   VNPAY_RETURN_URL    — URL VNPay redirects customer to after payment
 *
 * Docs: https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html
 */
export class VnpayProvider implements PaymentProvider {
  name = 'VNPAY'

  async createPaymentLink(params: CreatePaymentParams): Promise<PaymentLinkResult> {
    const tmnCode = process.env.VNPAY_TMN_CODE ?? ''
    const hashSecret = process.env.VNPAY_HASH_SECRET ?? ''
    const gatewayUrl = (process.env.VNPAY_PAYMENT_URL ?? 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html').replace(/\/$/, '')
    const returnUrl = process.env.VNPAY_RETURN_URL ?? params.returnUrl

    if (!tmnCode || !hashSecret) {
      throw new Error('[VNPay] Missing env: VNPAY_TMN_CODE, VNPAY_HASH_SECRET')
    }

    const now = new Date()
    const expire = new Date(now.getTime() + 15 * 60 * 1000)

    // VNPay requires amount * 100 (e.g., 50,000 VND → 5,000,000)
    const vnpParams: Record<string, string> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: tmnCode,
      vnp_Amount: String(params.amount * 100),
      vnp_CreateDate: toVnpDate(now),
      vnp_CurrCode: 'VND',
      vnp_IpAddr: '127.0.0.1',
      vnp_Locale: 'vn',
      vnp_OrderInfo: params.description.slice(0, 255),
      vnp_OrderType: '190000',
      vnp_ReturnUrl: returnUrl,
      vnp_TxnRef: params.orderCode,
      vnp_ExpireDate: toVnpDate(expire),
    }

    const signData = sortedRawString(vnpParams)
    const signature = hmac512(signData, hashSecret)

    const queryString = sortedUrlEncoded(vnpParams)
    const fullUrl = `${gatewayUrl}?${queryString}&vnp_SecureHash=${signature}`

    return {
      paymentLinkId: params.orderCode,
      paymentUrl: fullUrl,
      qrCode: '',
      expiredAt: expire,
    }
  }

  /**
   * Verifies VNPay IPN/return URL signature using HMAC-SHA512.
   * Payload should be the decoded query params object (key → value strings).
   *
   * vnp_ResponseCode '00' = payment success.
   * The CALLER must check vnp_ResponseCode separately after valid: true.
   */
  verifyWebhook(payload: unknown): WebhookVerifyResult {
    const p = payload as Record<string, string>
    const hashSecret = process.env.VNPAY_HASH_SECRET
    if (!hashSecret) return { valid: false }

    const { vnp_SecureHash, vnp_SecureHashType, ...rest } = p
    void vnp_SecureHashType

    if (!vnp_SecureHash) return { valid: false }

    const signData = sortedRawString(rest)
    const expected = hmac512(signData, hashSecret)

    if (expected.toLowerCase() !== vnp_SecureHash.toLowerCase()) return { valid: false }

    // VNPay amount is * 100 — convert back to VND
    const rawAmount = Number(p.vnp_Amount ?? 0)
    const amount = Math.round(rawAmount / 100)

    return {
      valid: true,
      orderCode: String(p.vnp_TxnRef),
      amount,
      transactionId: String(p.vnp_TransactionNo ?? ''),
      description: String(p.vnp_OrderInfo ?? ''),
    }
  }
}
