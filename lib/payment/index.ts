import type { PaymentProvider } from './types'

export type { PaymentProvider, CreatePaymentParams, PaymentLinkResult, WebhookVerifyResult } from './types'

let _provider: PaymentProvider | null = null

export function getPaymentProvider(): PaymentProvider {
  if (_provider) return _provider

  const name = process.env.PAYMENT_PROVIDER?.toUpperCase() || 'MOCK'

  if (name === 'PAYOS') {
    const { PayOSProvider } = require('./payos')
    _provider = new PayOSProvider()
  } else if (name === 'SEPAY') {
    const { SepayProvider } = require('./sepay')
    _provider = new SepayProvider()
  } else {
    const { MockPaymentProvider } = require('./mock')
    _provider = new MockPaymentProvider()
  }

  return _provider!
}
