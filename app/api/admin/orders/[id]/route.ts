import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { updateOrderSchema } from '@/lib/validators'
import { securityLog } from '@/lib/securityLog'
import { getClientIp } from '@/lib/rateLimit'
import { sendDeliveryEmail } from '@/lib/email'
import { guardObjectId } from '@/lib/db/real'

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const guard = guardObjectId(params.id)
  if (guard) return guard
  try {
    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        product: true,
        plan: true,
      },
    })
    if (!order) {
      return NextResponse.json({ error: 'Không tìm thấy đơn hàng' }, { status: 404 })
    }
    return NextResponse.json(order)
  } catch (error) {
    console.error('GET /api/admin/orders/[id] error:', error)
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const guard = guardObjectId(params.id)
  if (guard) return guard
  try {
    const body = await request.json()
    const parsed = updateOrderSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dữ liệu không hợp lệ', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const data: Record<string, unknown> = {}
    if (parsed.data.status) data.status = parsed.data.status
    if (parsed.data.internalNote !== undefined) data.internalNote = parsed.data.internalNote
    if (parsed.data.deliveryContent !== undefined) data.deliveryContent = parsed.data.deliveryContent
    if (parsed.data.deliveryVisible !== undefined) data.deliveryVisible = parsed.data.deliveryVisible
    if (parsed.data.completedAt !== undefined) {
      data.completedAt = parsed.data.completedAt ? new Date(parsed.data.completedAt) : null
    }

    const order = await prisma.order.update({
      where: { id: params.id },
      data,
      include: {
        product: { select: { name: true, icon: true } },
        plan: { select: { name: true, price: true } },
      },
    })

    if (parsed.data.deliveryContent !== undefined || parsed.data.deliveryVisible !== undefined) {
      securityLog('DELIVERY_UPDATED', { ip: getClientIp(request), orderId: params.id, visible: String(parsed.data.deliveryVisible ?? '') })
    }
    if (parsed.data.status) {
      securityLog('ORDER_STATUS_UPDATED', { ip: getClientIp(request), orderId: params.id, status: parsed.data.status })
    }

    // Auto-send email when deliveryVisible is turned on and all conditions met
    if (
      parsed.data.deliveryVisible === true &&
      order.email &&
      order.deliveryContent &&
      order.paymentStatus === 'paid' &&
      order.emailStatus !== 'sent' // don't resend if already sent
    ) {
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
    }

    return NextResponse.json(order)
  } catch (error) {
    console.error('PATCH /api/admin/orders/[id] error:', error)
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
