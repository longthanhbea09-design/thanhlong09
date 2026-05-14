// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PayOS } = require('@payos/node')
import type { CreatePaymentParams, PaymentLinkResult, PaymentProvider, WebhookVerifyResult } from './types'

export class PayOSProvider implements PaymentProvider {
  name = 'PAYOS'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private client: any

  constructor() {
    this.client = new PayOS(
      process.env.PAYOS_CLIENT_ID!,
      process.env.PAYOS_API_KEY!,
      process.env.PAYOS_CHECKSUM_KEY!
    )
  }

  async createPaymentLink(params: CreatePaymentParams): Promise<PaymentLinkResult> {
    const numericRef = parseInt(params.paymentRef)

    const result = await this.client.createPaymentLink({
      orderCode: numericRef,
      amount: params.amount,
      description: params.orderCode,
      returnUrl: params.returnUrl,
      cancelUrl: params.cancelUrl,
    })

    return {
      paymentLinkId: result.paymentLinkId,
      paymentUrl: result.checkoutUrl,
      qrCode: result.qrCode,
      expiredAt: new Date(Date.now() + 15 * 60 * 1000),
    }
  }

  verifyWebhook(payload: unknown): WebhookVerifyResult {
    try {
      const isValid = this.client.verifyPaymentWebhookData(payload)
      if (!isValid) return { valid: false }

      const p = payload as { data?: { amount?: number; transactionId?: string; description?: string } }
      return {
        valid: true,
        orderCode: p.data?.description,
        amount: p.data?.amount,
        transactionId: p.data?.transactionId,
        description: p.data?.description,
      }
    } catch {
      return { valid: false }
    }
  }
}
