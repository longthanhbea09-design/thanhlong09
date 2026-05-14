import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { orderSchema } from '@/lib/validators'
import { generateOrderCode } from '@/lib/utils'
import { getPaymentProvider } from '@/lib/payment'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (body.honeypot?.length > 0) {
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

    const plan = await prisma.productPlan.findFirst({
      where: { id: planId, productId, isActive: true },
      include: { product: true },
    })

    if (!plan) {
      return NextResponse.json({ error: 'Sản phẩm hoặc gói không tồn tại' }, { status: 404 })
    }

    const orderCode = generateOrderCode()
    const paymentRef = Date.now().toString()
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

    const provider = getPaymentProvider()
    const paymentResult = await provider.createPaymentLink({
      orderCode,
      paymentRef,
      amount: plan.price,
      description: `${plan.product.name} - ${plan.name}`,
      returnUrl: `${siteUrl}/checkout/${orderCode}`,
      cancelUrl: `${siteUrl}/checkout/${orderCode}?cancelled=1`,
    })

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
        amount: plan.price,
        paymentStatus: 'pending',
        paymentProvider: provider.name,
        paymentLinkId: paymentResult.paymentLinkId,
        paymentUrl: paymentResult.paymentUrl,
        qrCode: paymentResult.qrCode,
        paymentRef,
        expiredAt: paymentResult.expiredAt,
      },
    })

    return NextResponse.json({
      success: true,
      orderCode: order.orderCode,
      paymentUrl: paymentResult.paymentUrl,
    })
  } catch (error) {
    console.error('POST /api/checkout/create error:', error)
    return NextResponse.json({ error: 'Lỗi server, vui lòng thử lại' }, { status: 500 })
  }
}
