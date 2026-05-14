import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * Public endpoint — used by /checkout/[orderCode] page to poll payment status.
 * Does NOT return deliveryContent: phone verification is required for that.
 * Customers who want delivery info must use POST /api/orders/lookup (orderCode + phone).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { orderCode: string } }
) {
  try {
    const order = await prisma.order.findUnique({
      where: { orderCode: params.orderCode },
      include: {
        product: { select: { name: true, slug: true } },
        plan: { select: { name: true, duration: true, price: true } },
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'Không tìm thấy đơn hàng' }, { status: 404 })
    }

    // deliveryContent is intentionally omitted — phone not verified here
    return NextResponse.json({
      orderCode: order.orderCode,
      customerName: order.customerName,
      productName: order.product.name,
      planName: order.plan.name,
      amount: order.amount,
      paymentStatus: order.paymentStatus,
      paymentUrl: order.paymentUrl,
      qrCode: order.qrCode,
      paymentProvider: order.paymentProvider,
      paidAt: order.paidAt,
      expiredAt: order.expiredAt,
      status: order.status,
    })
  } catch (error) {
    console.error('GET /api/orders/[orderCode] error:', error)
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
