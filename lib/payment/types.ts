export interface CreatePaymentParams {
  orderCode: string
  paymentRef: string
  amount: number
  description: string
  returnUrl: string
  cancelUrl: string
}

export interface PaymentLinkResult {
  paymentLinkId: string
  paymentUrl: string
  qrCode: string
  expiredAt: Date
}

export interface WebhookVerifyResult {
  valid: boolean
  orderCode?: string
  amount?: number
  transactionId?: string
  description?: string
}

export interface PaymentProvider {
  name: string
  createPaymentLink(params: CreatePaymentParams): Promise<PaymentLinkResult>
  verifyWebhook(payload: unknown, headers: Record<string, string>): WebhookVerifyResult
}
