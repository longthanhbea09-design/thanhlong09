import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { processPaymentWebhook } from '@/lib/payment/handleWebhookPayment'

/**
 * Admin-only endpoint: simulate payment confirmation on a pending order.
 * Used for:
 *   - Manual testing without a real payment provider
 *   - Recovery when webhook failed but money was received
 *
 * POST /api/admin/payment/test-webhook
 * Body: { orderCode, amount? }
 *
 * Protected by admin layout — no additional auth needed for this shop's architecture.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { orderCode, amount: overrideAmount } = body as {
      orderCode?: string
      amount?: number
    }

    if (!orderCode) {
      return NextResponse.json({ error: 'orderCode là bắt buộc' }, { status: 400 })
    }

    const order = await prisma.order.findUnique({
      where: { orderCode },
      select: { id: true, orderCode: true, amount: true, paymentStatus: true },
    })

    if (!order) {
      return NextResponse.json({ error: 'Không tìm thấy đơn hàng' }, { status: 404 })
    }

    if (order.paymentStatus === 'paid') {
      return NextResponse.json({
        ok: true,
        message: 'Đơn hàng đã được thanh toán trước đó',
        alreadyPaid: true,
      })
    }

    const amount = overrideAmount ?? order.amount
    const transactionId = `admin-test-${Date.now()}`

    const { ok, message } = await processPaymentWebhook({
      orderCode: order.orderCode,
      amount,
      transactionId,
      description: `Admin test payment for ${orderCode}`,
      provider: 'ADMIN_TEST',
      rawPayload: JSON.stringify({ orderCode, amount, triggeredBy: 'admin' }),
    })

    return NextResponse.json({ ok, message })
  } catch (error) {
    console.error('Admin test-webhook error:', error)
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
