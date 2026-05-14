import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { orderSchema } from '@/lib/validators'
import { generateOrderCode } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // honeypot check
    if (body.honeypot && body.honeypot.length > 0) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const parsed = orderSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dữ liệu không hợp lệ', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { customerName, phone, email, contactMethod, productId, planId, note } = parsed.data

    // verify product & plan exist
    const plan = await prisma.productPlan.findFirst({
      where: { id: planId, productId, isActive: true },
      include: { product: true },
    })

    if (!plan) {
      return NextResponse.json({ error: 'Sản phẩm hoặc gói không tồn tại' }, { status: 404 })
    }

    const orderCode = generateOrderCode()

    const order = await prisma.order.create({
      data: {
        orderCode,
        customerName,
        phone,
        email: email || null,
        contactMethod,
        productId,
        planId,
        note: note || null,
        status: 'new',
      },
    })

    return NextResponse.json({
      success: true,
      orderCode: order.orderCode,
      message: 'Đơn hàng đã được ghi nhận. ThanhLongShop sẽ liên hệ với bạn trong ít phút!',
    })
  } catch (error) {
    console.error('POST /api/orders error:', error)
    return NextResponse.json({ error: 'Lỗi server, vui lòng thử lại' }, { status: 500 })
  }
}
