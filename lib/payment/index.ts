import type { PaymentProvider } from './types'

export type { PaymentProvider, CreatePaymentParams, PaymentLinkResult, WebhookVerifyResult } from './types'

let _provider: PaymentProvider | null = null

export function getPaymentProvider(): PaymentProvider {
  if (_provider) return _provider

  const name = (process.env.PAYMENT_PROVIDER ?? 'MOCK').toUpperCase()

  if (name === 'PAYOS') {
    const { PayOSProvider } = require('./payos')
    _provider = new PayOSProvider()
  } else if (name === 'SEPAY') {
    const { SepayProvider } = require('./sepay')
    _provider = new SepayProvider()
  } else if (name === 'MOMO') {
    const { MomoProvider } = require('./momo')
    _provider = new MomoProvider()
  } else if (name === 'VNPAY') {
    const { VnpayProvider } = require('./vnpay')
    _provider = new VnpayProvider()
  } else {
    const { MockPaymentProvider } = require('./mock')
    _provider = new MockPaymentProvider()
  }

  return _provider!
}

/** Force re-init (useful in tests after changing PAYMENT_PROVIDER) */
export function resetPaymentProvider(): void {
  _provider = null
}
