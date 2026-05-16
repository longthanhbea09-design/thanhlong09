import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'
import { modalCheckoutSchema } from '@/lib/validators'
import { generateOrderCode } from '@/lib/utils'
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rateLimit'
import { securityLog } from '@/lib/securityLog'
import {
  getPaymentSettings,
  buildMbBankQrUrl,
  buildMbBankPaymentContent,
} from '@/lib/payments/payment-settings'
import { createMomoPayment } from '@/lib/payments/momo-service'
import { getSaleStatus } from '@/lib/saleStatus'

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

    // SECURITY: ignore any paymentMethod/amount/price sent by client — server decides everything
    const parsed = modalCheckoutSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dữ liệu không hợp lệ', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { customerName, phone, email, note, planId } = parsed.data

    // 1. Fetch plan + product from DB — server owns the price
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

    // Server-side stock + saleMode validation
    const stockCount = await prisma.accountStock.count({
      where: { planId: plan.id, status: 'available' },
    })
    const saleStatus = getSaleStatus({
      planSaleMode: plan.saleMode,
      planAvailable: plan.available,
      stockCount,
    })

    if (saleStatus === 'HIDDEN') {
      return NextResponse.json({ error: 'Gói này không khả dụng' }, { status: 400 })
    }
    if (saleStatus === 'MAINTENANCE') {
      return NextResponse.json({ error: 'Gói này đang bảo trì, vui lòng thử lại sau' }, { status: 400 })
    }
    if (saleStatus === 'OUT_OF_STOCK') {
      return NextResponse.json({ error: 'Gói này hiện đã hết hàng, vui lòng chọn gói khác' }, { status: 400 })
    }

    const isPreorder = saleStatus === 'PREORDER'

    // 2. Read admin-configured payment settings — server decides which method
    const settings = await getPaymentSettings()
    const method = settings.activePaymentMethod // 'MOMO' | 'MB_BANK' | 'DISABLED'

    if (method === 'DISABLED') {
      return NextResponse.json(
        { error: 'Shop đang tạm tắt thanh toán. Vui lòng quay lại sau.' },
        { status: 503 }
      )
    }

    // 3. Generate order identifiers
    const orderCode = generateOrderCode()
    const accessToken = randomBytes(32).toString('hex')
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const amount = plan.price

    // 4. Build payment data based on active method
    let paymentUrl: string | null = null
    let qrCode: string | null = null
    let paymentContent: string | null = null
    let paymentLinkId: string | null = null
    let expiredAt: Date | null = null

    if (method === 'MOMO') {
      // returnUrl: MoMo redirects here after payment — display only, never triggers delivery
      const momoReturnBase =
        settings.momoReturnUrl ||
        process.env.MOMO_RETURN_URL ||
        `${siteUrl}/payment/momo/return`
      const returnUrl = `${momoReturnBase}?orderCode=${orderCode}&token=${accessToken}`
      const result = await createMomoPayment(
        orderCode,
        amount,
        `${plan.product.name} - ${plan.name}`,
        returnUrl,
        settings
      )
      paymentUrl = result.payUrl
      qrCode = result.qrCodeUrl
      paymentLinkId = result.requestId
      expiredAt = new Date(Date.now() + 15 * 60 * 1000)
    } else {
      // MB_BANK: generate dynamic VietQR per order
      paymentContent = buildMbBankPaymentContent(settings, orderCode)
      qrCode = buildMbBankQrUrl(settings, amount, paymentContent)
    }

    // 5. Persist order — server sets amount and paymentProvider, client cannot influence these
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
        amount,
        paymentStatus: 'pending',
        deliveryStatus: isPreorder ? 'waiting_stock' : 'waiting_payment',
        paymentProvider: method,
        paymentLinkId,
        paymentUrl,
        qrCode,
        paymentContent,
        accessToken,
        expiredAt,
        // Snapshot bank info at creation time so checkout page always shows
        // the account/bank used when order was placed — even if admin changes settings later
        ...(method === 'MB_BANK' && {
          paymentBankName: settings.mbBankName,
          paymentAccountNumber: settings.mbBankAccountNumber,
          paymentAccountName: settings.mbBankAccountName,
        }),
      },
    })

    // 6. Return only what the client needs to display checkout
    const response: Record<string, unknown> = {
      success: true,
      orderCode: order.orderCode,
      accessToken,
      amount,
      paymentMethod: method,
    }

    if (method === 'MOMO') {
      response.paymentUrl = paymentUrl
      response.qrCode = qrCode
    }
    // MB_BANK: checkout page fetches order details to display bank info

    return NextResponse.json(response)
  } catch (error) {
    console.error('POST /api/checkout/create error:', error)
    const message = error instanceof Error ? error.message : 'Lỗi server, vui lòng thử lại'
    // Don't expose internal details to client
    const clientMessage = message.startsWith('MoMo') || message.startsWith('Shop')
      ? message
      : 'Lỗi server, vui lòng thử lại'
    return NextResponse.json({ error: clientMessage }, { status: 500 })
  }
}
