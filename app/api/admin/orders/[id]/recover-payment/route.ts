import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { processPaymentWebhook } from '@/lib/payment/handleWebhookPayment'

/**
 * POST /api/admin/orders/[id]/recover-payment
 *
 * Reprocesses payment confirmation for a stuck order.
 * Use ONLY when:
 *   - SePay/bank already received the money (confirmed in SePay dashboard or bank statement)
 *   - The automatic webhook failed due to a past bug (e.g., orderId null filter, auth misconfiguration)
 *   - The order is still in paymentStatus=pending despite real payment having occurred
 *
 * This is a recovery/backfill tool, NOT part of the normal payment flow.
 * Normal flow: SePay webhook → /api/payments/sepay/webhook → auto paid + delivered.
 *
 * [id] = MongoDB ObjectId of the order (consistent with confirm-payment, deliver, resend-email).
 * Optional body: { amount? } to override the order amount if needed.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json().catch(() => ({}))
    const { amount: overrideAmount } = body as { amount?: number }

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        orderCode: true,
        amount: true,
        paymentStatus: true,
        deliveryStatus: true,
        status: true,
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'Không tìm thấy đơn hàng' }, { status: 404 })
    }

    if (order.paymentStatus === 'paid') {
      return NextResponse.json({
        ok: true,
        message: 'Đơn hàng đã được thanh toán — không cần recover',
        alreadyPaid: true,
        order: {
          orderCode: order.orderCode,
          paymentStatus: order.paymentStatus,
          deliveryStatus: order.deliveryStatus,
          status: order.status,
        },
      })
    }

    const amount = overrideAmount ?? order.amount
    const transactionId = `admin-recover-${Date.now()}`

    console.log(
      `[admin/recover-payment] Reprocessing stuck order orderCode=${order.orderCode} amount=${amount}`
    )

    const result = await processPaymentWebhook({
      orderCode: order.orderCode,
      amount,
      transactionId,
      description: `Admin recovery reprocess for ${order.orderCode}`,
      provider: 'ADMIN_RECOVERY',
      rawPayload: JSON.stringify({
        recoveredBy: 'admin',
        orderId: order.id,
        orderCode: order.orderCode,
        amount,
        ts: new Date().toISOString(),
      }),
    })

    const updated = await prisma.order.findUnique({
      where: { id: params.id },
      select: {
        paymentStatus: true,
        deliveryStatus: true,
        status: true,
        paidAmount: true,
        paidAt: true,
        deliveredAt: true,
      },
    })

    return NextResponse.json({
      ok: result.ok,
      message: result.message,
      processStatus: result.status,
      order: updated,
    })
  } catch (error) {
    console.error('[admin/recover-payment] error:', error)
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
