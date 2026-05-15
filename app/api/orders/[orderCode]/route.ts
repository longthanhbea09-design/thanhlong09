import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getPaymentSettings, buildMbBankQrUrl } from '@/lib/payments/payment-settings'

export const dynamic = 'force-dynamic'

/**
 * Public endpoint — polled by /checkout/[orderCode] page.
 * deliveryContent intentionally omitted — phone verification required at /orders/lookup.
 * Includes payment display info so the checkout page doesn't need a separate settings fetch.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { orderCode: string } }
) {
  try {
    const order = await prisma.order.findUnique({
      where: { orderCode: params.orderCode },
      include: {
        product: { select: { name: true, slug: true } },
        plan: { select: { name: true, duration: true, price: true } },
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'Không tìm thấy đơn hàng' }, { status: 404 })
    }

    // For MB_BANK orders: include bank display info from PaymentSettings
    let mbBankInfo: Record<string, string | null> | null = null
    if (order.paymentProvider === 'MB_BANK') {
      const settings = await getPaymentSettings()
      // Re-generate QR URL in case settings changed (or use stored order.qrCode)
      const qrUrl = order.qrCode || buildMbBankQrUrl(settings, order.amount, order.paymentContent ?? order.orderCode)
      mbBankInfo = {
        bankName: settings.mbBankName,
        accountNumber: settings.mbBankAccountNumber,
        accountName: settings.mbBankAccountName,
        paymentContent: order.paymentContent ?? order.orderCode,
        qrCodeUrl: qrUrl,
      }
    }

    return NextResponse.json({
      orderCode: order.orderCode,
      customerName: order.customerName,
      productName: order.product.name,
      planName: order.plan.name,
      amount: order.amount,
      paymentStatus: order.paymentStatus,
      paymentProvider: order.paymentProvider,
      paymentUrl: order.paymentUrl,
      qrCode: order.qrCode,
      paidAt: order.paidAt,
      expiredAt: order.expiredAt,
      status: order.status,
      deliveryStatus: order.deliveryStatus,
      mbBankInfo,
    })
  } catch (error) {
    console.error('GET /api/orders/[orderCode] error:', error)
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
