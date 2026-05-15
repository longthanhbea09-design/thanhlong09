import { prisma } from '@/lib/prisma'
import { autoDelivery } from '@/lib/autoDelivery'
import { getPaymentSettings } from '@/lib/payments/payment-settings'

interface ProcessPaymentParams {
  orderCode: string
  amount: number
  transactionId: string
  description: string
  provider: string
  rawPayload: string
}

export async function processPaymentWebhook({
  orderCode,
  amount,
  transactionId,
  description,
  provider,
  rawPayload,
}: ProcessPaymentParams): Promise<{ ok: boolean; message: string }> {
  const order = await prisma.order.findUnique({ where: { orderCode } })

  if (!order) return { ok: false, message: 'Order not found' }
  if (order.paymentStatus === 'paid') return { ok: true, message: 'Already paid' }

  // Reject payment if order has expired
  if (order.expiredAt && new Date() > order.expiredAt) {
    await prisma.order.update({
      where: { id: order.id },
      data: { paymentStatus: 'expired' },
    })
    console.warn(`[webhook] Rejected late payment for expired order ${orderCode}`)
    return { ok: false, message: 'Order expired' }
  }

  // Chống trùng giao dịch
  if (transactionId) {
    const existing = await prisma.paymentTransaction.findFirst({
      where: { transactionId },
    })
    if (existing) return { ok: true, message: 'Duplicate transaction' }
  }

  // Không chấp nhận nếu số tiền nhỏ hơn số tiền đơn
  if (amount < order.amount) {
    await prisma.paymentTransaction.create({
      data: {
        orderId: order.id,
        provider,
        transactionId,
        amount,
        description,
        rawPayload,
        status: 'underpaid',
      },
    })
    return { ok: false, message: `Underpaid: got ${amount}, expected ${order.amount}` }
  }

  await prisma.$transaction([
    prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: 'paid',
        status: 'paid',
        paidAmount: amount,
        transactionId,
        paidAt: new Date(),
      },
    }),
    prisma.paymentTransaction.create({
      data: {
        orderId: order.id,
        provider,
        transactionId,
        amount,
        description,
        rawPayload,
        status: 'paid',
      },
    }),
  ])

  // Auto-deliver only if enabled in payment settings
  const paymentSettings = await getPaymentSettings()
  if (paymentSettings.autoDeliverAfterPaid) {
    await autoDelivery(order.id)
  }

  return { ok: true, message: 'Payment confirmed' }
}
