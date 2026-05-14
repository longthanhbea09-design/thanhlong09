import { NextRequest, NextResponse } from 'next/server'
import { getPaymentProvider } from '@/lib/payment'
import { processPaymentWebhook } from '@/lib/payment/handleWebhookPayment'

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()
    const headers = Object.fromEntries(request.headers.entries())

    const provider = getPaymentProvider()
    const result = provider.verifyWebhook(payload, headers)

    if (!result.valid || !result.orderCode) {
      return NextResponse.json({ error: 'Invalid webhook' }, { status: 400 })
    }

    const { ok, message } = await processPaymentWebhook({
      orderCode: result.orderCode,
      amount: result.amount ?? 0,
      transactionId: result.transactionId ?? '',
      description: result.description ?? '',
      provider: 'PAYOS',
      rawPayload: JSON.stringify(payload),
    })

    return NextResponse.json({ ok, message })
  } catch (error) {
    console.error('PayOS webhook error:', error)
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 })
  }
}
