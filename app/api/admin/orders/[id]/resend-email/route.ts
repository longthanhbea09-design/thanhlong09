import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendDeliveryEmail } from '@/lib/email'
import { getClientIp } from '@/lib/rateLimit'
import { securityLog } from '@/lib/securityLog'
import { guardObjectId } from '@/lib/db/real'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const guard = guardObjectId(params.id)
  if (guard) return guard
  const ip = getClientIp(request)

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      product: { select: { name: true } },
      plan: { select: { name: true } },
    },
  })

  if (!order) return NextResponse.json({ error: 'Không tìm thấy đơn hàng' }, { status: 404 })
  if (!order.email) return NextResponse.json({ error: 'Đơn hàng không có email khách' }, { status: 400 })
  if (!order.deliveryContent) return NextResponse.json({ error: 'Chưa có nội dung bàn giao để gửi' }, { status: 400 })
  if (order.paymentStatus !== 'paid') return NextResponse.json({ error: 'Đơn hàng chưa thanh toán' }, { status: 400 })

  const sent = await sendDeliveryEmail({
    to: order.email,
    orderCode: order.orderCode,
    customerName: order.customerName,
    productName: order.product.name,
    variantName: order.plan.name,
    amount: order.amount,
    deliveryContent: order.deliveryContent,
  })

  await prisma.order.update({
    where: { id: params.id },
    data: {
      emailStatus: sent ? 'sent' : 'failed',
      emailSentAt: sent ? new Date() : undefined,
    },
  })

  securityLog('DELIVERY_EMAIL_RESENT', { ip, orderId: params.id, success: String(sent) })

  return NextResponse.json({ success: sent, emailStatus: sent ? 'sent' : 'failed' })
}
