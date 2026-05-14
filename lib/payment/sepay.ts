import type { PaymentProvider, CreatePaymentParams, PaymentLinkResult, WebhookVerifyResult } from './types'

// SePay là webhook-based: không tạo payment link, chỉ nhận webhook biến động số dư
// Khách chuyển khoản theo thông tin ngân hàng, nội dung chứa orderCode
export class SepayProvider implements PaymentProvider {
  name = 'SEPAY'

  async createPaymentLink(params: CreatePaymentParams): Promise<PaymentLinkResult> {
    // SePay không tạo link — trả về QR chuyển khoản thủ công
    const qrCode = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(params.orderCode)}`
    return {
      paymentLinkId: `sepay-${params.paymentRef}`,
      paymentUrl: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/checkout/${params.orderCode}`,
      qrCode,
      expiredAt: new Date(Date.now() + 30 * 60 * 1000),
    }
  }

  // SePay gửi webhook với API key trong header x-api-key
  verifyWebhook(payload: unknown, headers: Record<string, string>): WebhookVerifyResult {
    const apiKey = headers['x-api-key'] || headers['authorization']?.replace('Bearer ', '')
    if (!apiKey || apiKey !== process.env.SEPAY_API_KEY) {
      return { valid: false }
    }

    const p = payload as Record<string, unknown>
    const content = (p.content || p.description || '') as string

    // Tìm orderCode trong nội dung chuyển khoản (TLS-YYYYMMDD-XXXX)
    const match = content.match(/TLS-\d{8}-\d{4}/i)
    if (!match) return { valid: false }

    return {
      valid: true,
      orderCode: match[0].toUpperCase(),
      amount: p.transferAmount as number,
      transactionId: p.id as string,
      description: content,
    }
  }
}
