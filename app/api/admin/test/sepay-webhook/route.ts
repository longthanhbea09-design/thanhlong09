import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { processPaymentWebhook } from '@/lib/payment/handleWebhookPayment'

/**
 * POST /api/admin/test/sepay-webhook
 *
 * Simulates a SePay webhook payload for a specific order.
 * Bypasses the Authorization header check — admin-only, protected by middleware JWT.
 *
 * Body: { orderCode, amount?, referenceCode? }
 *
 * Use this to:
 *   - Confirm an order that SePay detected but webhook failed (auth issue, timeout, etc.)
 *   - Debug the full processPaymentWebhook + autoDelivery flow on a real order
 *   - Recover from a production webhook failure without re-deploying
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { orderCode, amount: overrideAmount, referenceCode } = body as {
      orderCode?: string
      amount?: number
      referenceCode?: string
    }

    if (!orderCode) {
      return NextResponse.json({ error: 'orderCode là bắt buộc' }, { status: 400 })
    }

    const order = await prisma.order.findUnique({
      where: { orderCode },
      select: { id: true, orderCode: true, amount: true, paymentStatus: true, deliveryStatus: true },
    })

    if (!order) {
      return NextResponse.json({ error: `Không tìm thấy đơn hàng: ${orderCode}` }, { status: 404 })
    }

    const amount = overrideAmount ?? order.amount
    const transactionId = `admin-sepay-test-${Date.now()}`

    // Build a realistic SePay payload for logging
    const simulatedPayload = {
      id: transactionId,
      gateway: 'MB_BANK',
      transactionDate: new Date().toISOString(),
      accountNumber: 'ADMIN_TEST',
      code: null,
      content: `ADMIN TEST ${orderCode.replace(/-/g, '')}`,
      transferType: 'in',
      transferAmount: amount,
      referenceCode: referenceCode ?? null,
      description: `Admin simulated SePay webhook for ${orderCode}`,
    }

    console.log(`[admin/test/sepay-webhook] Simulating SePay webhook for orderCode=${orderCode} amount=${amount}`)

    const result = await processPaymentWebhook({
      orderCode,
      amount,
      transactionId,
      description: referenceCode ?? `admin-test-${orderCode}`,
      provider: 'ADMIN_SEPAY_SIM',
      rawPayload: JSON.stringify(simulatedPayload),
    })

    // Fetch updated order state after processing
    const updated = await prisma.order.findUnique({
      where: { orderCode },
      select: {
        paymentStatus: true,
        deliveryStatus: true,
        status: true,
        paidAmount: true,
        paidAt: true,
        deliveredAt: true,
      },
    })

    return NextResponse.json({
      ok: result.ok,
      message: result.message,
      processStatus: result.status,
      order: updated,
    })
  } catch (error) {
    console.error('[admin/test/sepay-webhook] error:', error)
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
