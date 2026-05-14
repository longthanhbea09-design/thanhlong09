import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rateLimit'
import { securityLog } from '@/lib/securityLog'

export const dynamic = 'force-dynamic'

// 20 lookup attempts per hour per IP — prevents phone brute-force on a known orderCode
const LOOKUP_LIMIT = 20
const LOOKUP_WINDOW = 60 * 60 * 1000

const lookupSchema = z
  .object({
    orderCode: z.string().min(1).max(50),
    phone: z.string().min(9).max(11).regex(/^[0-9]+$/).optional(),
    email: z.string().email().optional(),
  })
  .refine((d) => d.phone || d.email, { message: 'Cần nhập số điện thoại hoặc email' })

/**
 * deliveryContent is only shown when ALL conditions are true:
 *   - orderCode  ✓ (from input)
 *   - phone      ✓ (verified against DB)
 *   - paymentStatus === 'paid'
 *   - status === 'completed'
 *   - deliveryVisible === true
 */
function canShowDelivery(order: {
  paymentStatus: string
  status: string
  deliveryVisible: boolean
}): boolean {
  return (
    order.paymentStatus === 'paid' &&
    order.status === 'completed' &&
    order.deliveryVisible === true
  )
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)

  // Rate limit — 20 req/hour/IP
  const rl = checkRateLimit(`lookup:${ip}`, LOOKUP_LIMIT, LOOKUP_WINDOW)
  if (!rl.allowed) {
    securityLog('CHECKOUT_RATE_LIMITED', { ip, retryAfter: rl.retryAfter, endpoint: 'lookup' })
    return rateLimitResponse(rl.retryAfter)
  }

  try {
    // Check maintenance mode — customers cannot use lookup during maintenance
    const settings = await prisma.setting.findFirst({
      where: { id: 'singleton' },
      select: { maintenanceMode: true },
    })
    if (settings?.maintenanceMode) {
      return NextResponse.json(
        { error: 'Website đang bảo trì, vui lòng thử lại sau.' },
        { status: 503 }
      )
    }

    const body = await request.json()
    const parsed = lookupSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Thông tin tra cứu không hợp lệ' }, { status: 400 })
    }

    const { orderCode, phone, email } = parsed.data

    const order = await prisma.order.findUnique({
      where: { orderCode },
      include: {
        product: { select: { name: true, icon: true } },
        plan: { select: { name: true, duration: true, price: true } },
      },
    })

    // Verify identity: phone OR email must match — identical error prevents orderCode enumeration
    const phoneMatch = phone && order?.phone.replace(/\s/g, '') === phone.replace(/\s/g, '')
    const emailMatch = email && order?.email && order.email.toLowerCase() === email.toLowerCase()
    if (!order || (!phoneMatch && !emailMatch)) {
      securityLog('ADMIN_LOGIN_FAILED', {
        ip,
        reason: 'lookup_mismatch',
        orderCode: orderCode.slice(0, 15), // partial only — don't log full code
      })
      return NextResponse.json(
        { error: 'Không tìm thấy đơn hàng hoặc thông tin không khớp.' },
        { status: 404 }
      )
    }

    const showDelivery = canShowDelivery(order)

    // NEVER log deliveryContent
    return NextResponse.json({
      success: true,
      order: {
        orderCode: order.orderCode,
        customerName: order.customerName,
        productName: `${order.product.icon} ${order.product.name}`,
        variantName: order.plan.name,
        amount: order.amount,
        paymentStatus: order.paymentStatus,
        status: order.status,
        createdAt: order.createdAt,
        paidAt: order.paidAt,
        completedAt: order.completedAt,
        // deliveryContent only when all 5 conditions are met; null otherwise
        deliveryContent: showDelivery ? order.deliveryContent : null,
        // Do NOT return deliveryVisible — prevents customers from knowing content is
        // pending/hidden which could be used for social engineering ("admin said it's ready")
      },
    })
  } catch (error) {
    // Never log the request body (may contain phone/orderCode)
    console.error('POST /api/orders/lookup error: internal')
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
