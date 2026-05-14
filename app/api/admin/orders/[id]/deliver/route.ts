import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { autoDelivery } from '@/lib/autoDelivery'

/**
 * Admin-only: manually trigger auto-delivery for a paid order.
 * Use when:
 *   - Auto-delivery failed (out_of_stock) and stock has been replenished
 *   - Delivery errored and needs a retry
 *
 * POST /api/admin/orders/[id]/deliver
 * [id] = internal Order.id (not orderCode)
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: params.id },
      select: { id: true, orderCode: true, paymentStatus: true, deliveryStatus: true },
    })

    if (!order) {
      return NextResponse.json({ error: 'Không tìm thấy đơn hàng' }, { status: 404 })
    }

    if (order.paymentStatus !== 'paid') {
      return NextResponse.json(
        { error: 'Đơn chưa thanh toán, không thể giao hàng' },
        { status: 400 }
      )
    }

    if (order.deliveryStatus === 'delivered') {
      return NextResponse.json({ ok: true, message: 'Đơn đã được giao trước đó', alreadyDelivered: true })
    }

    const outcome = await autoDelivery(order.id)

    const messages: Record<string, string> = {
      delivered:    'Giao tài khoản thành công',
      out_of_stock: 'Kho hết hàng — vui lòng nạp thêm tài khoản và thử lại',
      skip:         'Bỏ qua — đơn đã xử lý trước đó',
      error:        'Lỗi khi giao hàng — kiểm tra server log',
    }

    return NextResponse.json({
      ok: outcome === 'delivered' || outcome === 'skip',
      outcome,
      message: messages[outcome] || outcome,
    })
  } catch (error) {
    console.error('POST /api/admin/orders/[id]/deliver error:', error)
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
