import { NextRequest, NextResponse } from 'next/server'
import { processPaymentWebhook } from '@/lib/payment/handleWebhookPayment'

/**
 * Mock webhook — only active when PAYMENT_PROVIDER=MOCK or NODE_ENV=development.
 * Used for local dev testing and integration tests.
 *
 * POST /api/webhooks/mock
 * Body: { orderCode, amount, transactionId? }
 *
 * No signature verification — never expose this in production with a real payment provider.
 */
export async function POST(request: NextRequest) {
  const isDevOrMock =
    process.env.NODE_ENV === 'development' ||
    process.env.PAYMENT_PROVIDER?.toUpperCase() === 'MOCK'

  if (!isDevOrMock) {
    return NextResponse.json({ error: 'Mock webhook disabled in production' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const orderCode = body.orderCode as string
    const amount = Number(body.amount)
    const transactionId = (body.transactionId as string) || `mock-${Date.now()}`

    if (!orderCode || !amount) {
      return NextResponse.json({ error: 'orderCode and amount are required' }, { status: 400 })
    }

    const { ok, message } = await processPaymentWebhook({
      orderCode,
      amount,
      transactionId,
      description: `Mock payment for ${orderCode}`,
      provider: 'MOCK',
      rawPayload: JSON.stringify(body),
    })

    return NextResponse.json({ ok, message })
  } catch (error) {
    console.error('Mock webhook error:', error)
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 })
  }
}
