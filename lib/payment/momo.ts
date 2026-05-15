import { createHmac } from 'crypto'
import type { CreatePaymentParams, PaymentLinkResult, PaymentProvider, WebhookVerifyResult } from './types'

function hmac256(data: string, key: string): string {
  return createHmac('sha256', key).update(data).digest('hex')
}

/**
 * MoMo Payment Provider — API v2 (payWithMethod).
 *
 * Env vars required:
 *   MOMO_PARTNER_CODE   — partner code from MoMo merchant portal
 *   MOMO_ACCESS_KEY     — access key
 *   MOMO_SECRET_KEY     — secret key (used for HMAC-SHA256 signing — never log)
 *   MOMO_IPN_URL        — full URL MoMo calls when payment completes
 *   MOMO_ENDPOINT       — optional; default test: https://test-payment.momo.vn
 *
 * Docs: https://developers.momo.vn/v3/docs/payment/api/collection-link
 */
export class MomoProvider implements PaymentProvider {
  name = 'MOMO'

  async createPaymentLink(params: CreatePaymentParams): Promise<PaymentLinkResult> {
    const partnerCode = process.env.MOMO_PARTNER_CODE ?? ''
    const accessKey = process.env.MOMO_ACCESS_KEY ?? ''
    const secretKey = process.env.MOMO_SECRET_KEY ?? ''
    const endpoint = (process.env.MOMO_ENDPOINT ?? 'https://test-payment.momo.vn').replace(/\/$/, '')
    const ipnUrl = process.env.MOMO_IPN_URL ?? ''

    if (!partnerCode || !accessKey || !secretKey || !ipnUrl) {
      throw new Error('[MoMo] Missing env: MOMO_PARTNER_CODE, MOMO_ACCESS_KEY, MOMO_SECRET_KEY, MOMO_IPN_URL')
    }

    const orderId = params.orderCode
    const requestId = `${orderId}-${Date.now()}`
    const amount = params.amount
    const orderInfo = params.description.slice(0, 255)
    const redirectUrl = params.returnUrl
    const requestType = 'payWithMethod'
    const extraData = ''

    // Signature: key-sorted pairs joined by '&', signed with HMAC-SHA256
    const rawHash = [
      `accessKey=${accessKey}`,
      `amount=${amount}`,
      `extraData=${extraData}`,
      `ipnUrl=${ipnUrl}`,
      `orderId=${orderId}`,
      `orderInfo=${orderInfo}`,
      `partnerCode=${partnerCode}`,
      `redirectUrl=${redirectUrl}`,
      `requestId=${requestId}`,
      `requestType=${requestType}`,
    ].join('&')

    const signature = hmac256(rawHash, secretKey)

    const body = {
      partnerCode, accessKey, requestId,
      amount, orderId, orderInfo,
      redirectUrl, ipnUrl, extraData,
      requestType, signature,
      lang: 'vi',
    }

    const res = await fetch(`${endpoint}/v2/gateway/api/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      throw new Error(`[MoMo] HTTP ${res.status}`)
    }

    const data = await res.json() as {
      resultCode: number
      message: string
      payUrl?: string
      qrCodeUrl?: string
    }

    if (data.resultCode !== 0) {
      throw new Error(`[MoMo] ${data.resultCode}: ${data.message}`)
    }

    return {
      paymentLinkId: requestId,
      paymentUrl: data.payUrl ?? '',
      qrCode: data.qrCodeUrl ?? '',
      expiredAt: new Date(Date.now() + 15 * 60 * 1000),
    }
  }

  /**
   * Verifies MoMo IPN signature using HMAC-SHA256.
   * The IPN rawHash fields are different from the create-link fields.
   *
   * resultCode 0 = payment success. The CALLER must check resultCode
   * separately after this returns valid: true.
   */
  verifyWebhook(payload: unknown): WebhookVerifyResult {
    const p = payload as Record<string, unknown>
    const secretKey = process.env.MOMO_SECRET_KEY
    const accessKey = process.env.MOMO_ACCESS_KEY
    if (!secretKey || !accessKey) return { valid: false }

    const {
      partnerCode, orderId, requestId, amount, orderInfo,
      orderType, transId, resultCode, message, payType,
      responseTime, extraData, signature,
    } = p

    // MoMo IPN signature: specific sorted params (different from create)
    const rawHash = [
      `accessKey=${accessKey}`,
      `amount=${amount}`,
      `extraData=${extraData ?? ''}`,
      `message=${message ?? ''}`,
      `orderId=${orderId}`,
      `orderInfo=${orderInfo}`,
      `orderType=${orderType ?? ''}`,
      `partnerCode=${partnerCode}`,
      `payType=${payType ?? ''}`,
      `requestId=${requestId}`,
      `responseTime=${responseTime}`,
      `resultCode=${resultCode}`,
      `transId=${transId}`,
    ].join('&')

    const expected = hmac256(rawHash, secretKey)
    if (expected !== signature) return { valid: false }

    return {
      valid: true,
      orderCode: String(orderId),
      amount: Number(amount),
      transactionId: String(transId),
      description: String(orderInfo),
    }
  }
}
