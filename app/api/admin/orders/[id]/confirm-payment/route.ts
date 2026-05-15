import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { autoDelivery } from '@/lib/autoDelivery'
import { securityLog } from '@/lib/securityLog'
import { getClientIp } from '@/lib/rateLimit'
import { guardObjectId } from '@/lib/db/real'

// Admin manually confirms that a customer has paid (for manual bank/ewallet transfers)
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const guard = guardObjectId(params.id)
  if (guard) return guard

  try {
    const order = await prisma.order.findUnique({ where: { id: params.id } })
    if (!order) {
      return NextResponse.json({ error: 'Không tìm thấy đơn hàng' }, { status: 404 })
    }
    if (order.paymentStatus === 'paid') {
      return NextResponse.json({ message: 'Đơn đã được xác nhận thanh toán trước đó' })
    }

    await prisma.order.update({
      where: { id: params.id },
      data: {
        paymentStatus: 'paid',
        status: 'paid',
        paidAmount: order.amount,
        paidAt: new Date(),
        paymentProvider: 'MANUAL',
      },
    })

    securityLog('PAYMENT_CONFIRMED', {
      ip: getClientIp(request),
      orderId: params.id,
      orderCode: order.orderCode,
      reason: 'admin_manual',
    })

    // Trigger auto-delivery (non-blocking — returns outcome string)
    const outcome = await autoDelivery(params.id)

    return NextResponse.json({ success: true, deliveryOutcome: outcome })
  } catch (error) {
    console.error('POST /api/admin/orders/[id]/confirm-payment error:', error)
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
