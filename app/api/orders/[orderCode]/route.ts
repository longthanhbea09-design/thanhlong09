import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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
