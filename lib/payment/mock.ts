import type { CreatePaymentParams, PaymentLinkResult, PaymentProvider, WebhookVerifyResult } from './types'

export class MockPaymentProvider implements PaymentProvider {
  name = 'MOCK'

  async createPaymentLink(params: CreatePaymentParams): Promise<PaymentLinkResult> {
    // Mock: generate a simple QR with order info (bank info shown from admin settings in UI)
    const qrCode = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(params.orderCode + ' - ' + params.amount)}`

    return {
      paymentLinkId: `mock-${params.paymentRef}`,
      paymentUrl: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/checkout/${params.orderCode}`,
      qrCode,
      expiredAt: new Date(Date.now() + 15 * 60 * 1000),
    }
  }

  verifyWebhook(payload: unknown): WebhookVerifyResult {
    const p = payload as Record<string, unknown>
    return {
      valid: true,
      orderCode: p.orderCode as string,
      amount: p.amount as number,
      transactionId: p.transactionId as string,
      description: p.description as string,
    }
  }
}
