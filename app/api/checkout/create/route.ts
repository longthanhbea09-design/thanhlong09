import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { orderSchema, modalCheckoutSchema } from '@/lib/validators'
import { generateOrderCode } from '@/lib/utils'
import { getPaymentProvider } from '@/lib/payment'
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rateLimit'
import { securityLog } from '@/lib/securityLog'

// 10 orders per hour per IP
const CHECKOUT_LIMIT = 10
const CHECKOUT_WINDOW = 60 * 60 * 1000

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const rl = checkRateLimit(`checkout:${ip}`, CHECKOUT_LIMIT, CHECKOUT_WINDOW)
  if (!rl.allowed) {
    securityLog('CHECKOUT_RATE_LIMITED', { ip, retryAfter: rl.retryAfter })
    return rateLimitResponse(rl.retryAfter)
  }

  try {
    const body = await request.json()

    if (body.honeypot?.length > 0) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    // Modal flow: only planId sent (no variantPrice from client)
    if (body.planId && !body.productId) {
      return handleModalCheckout(body)
    }

    return handleFormCheckout(body)
  } catch (error) {
    console.error('POST /api/checkout/create error:', error)
    return NextResponse.json({ error: 'Lỗi server, vui lòng thử lại' }, { status: 500 })
  }
}

async function handleModalCheckout(body: unknown) {
  const parsed = modalCheckoutSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dữ liệu không hợp lệ', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const { customerName, phone, email, note, planId } = parsed.data

  const plan = await prisma.productPlan.findFirst({
    where: { id: planId, isActive: true },
    include: { product: true },
  })

  if (!plan) {
    return NextResponse.json({ error: 'Gói không tồn tại hoặc đã ngừng bán' }, { status: 404 })
  }

  if (!plan.product.isActive) {
    return NextResponse.json({ error: 'Sản phẩm này hiện không còn bán' }, { status: 400 })
  }

  if (!plan.available) {
    return NextResponse.json({ error: 'Gói này tạm thời chưa có sẵn, vui lòng chọn gói khác' }, { status: 400 })
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
      email,
      contactMethod: 'zalo',
      productId: plan.productId,
      planId,
      note: note ? `[${plan.name}] ${note}` : `[${plan.name}]`,
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
    amount: plan.price,
    qrCode: paymentResult.qrCode,
    paymentUrl: paymentResult.paymentUrl,
  })
}

async function handleFormCheckout(body: unknown) {
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
}
