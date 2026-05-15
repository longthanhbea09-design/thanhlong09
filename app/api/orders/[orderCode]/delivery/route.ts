/**
 * GET /api/orders/[orderCode]/delivery?token=<accessToken>
 *
 * Returns delivery content for a paid, delivered order.
 * Authentication: accessToken (random 64-hex, stored in Order.accessToken).
 * Token is compared using timing-safe comparison to prevent timing attacks.
 *
 * Returns deliveryContent only when ALL conditions are true:
 *   - orderCode exists
 *   - token matches order.accessToken
 *   - paymentStatus === 'paid'
 *   - deliveryVisible === true
 *
 * Never reveals: phone, email, or internal IDs.
 * Never logs deliveryContent or accessToken.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'

// 30 attempts per hour per IP — prevents token brute-force
const LIMIT = 30
const WINDOW = 60 * 60 * 1000

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

export async function GET(
  request: NextRequest,
  { params }: { params: { orderCode: string } }
) {
  const ip = getClientIp(request)
  const rl = checkRateLimit(`delivery-token:${ip}`, LIMIT, WINDOW)
  if (!rl.allowed) return rateLimitResponse(rl.retryAfter)

  const token = new URL(request.url).searchParams.get('token') ?? ''
  if (!token || token.length !== 64) {
    return NextResponse.json({ error: 'Token không hợp lệ' }, { status: 401 })
  }

  try {
    const order = await prisma.order.findUnique({
      where: { orderCode: params.orderCode },
      include: {
        product: { select: { name: true, icon: true } },
        plan: { select: { name: true, duration: true } },
      },
    })

    // Identical error for not-found and wrong token — prevents orderCode enumeration
    if (!order || !order.accessToken) {
      return NextResponse.json({ error: 'Không tìm thấy đơn hàng' }, { status: 404 })
    }

    if (!timingSafeEqual(token, order.accessToken)) {
      return NextResponse.json({ error: 'Không tìm thấy đơn hàng' }, { status: 404 })
    }

    const canShowDelivery =
      order.paymentStatus === 'paid' &&
      order.deliveryVisible === true

    return NextResponse.json({
      orderCode: order.orderCode,
      customerName: order.customerName,
      productName: `${order.product.icon} ${order.product.name}`,
      planName: order.plan.name,
      amount: order.amount,
      paymentStatus: order.paymentStatus,
      deliveryStatus: order.deliveryStatus,
      deliveredAt: order.deliveredAt,
      paidAt: order.paidAt,
      // deliveryContent only when fully confirmed and visible
      deliveryContent: canShowDelivery ? order.deliveryContent : null,
    })
  } catch {
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
