import { prisma } from '@/lib/prisma'
import { sendDeliveryEmail } from '@/lib/email'

type DeliveryOutcome = 'delivered' | 'out_of_stock' | 'skip' | 'error'

function buildDeliveryContent(acc: {
  username: string
  password: string
  extraInfo: string
}): string {
  const lines = [`Tài khoản: ${acc.username}`, `Mật khẩu: ${acc.password}`]
  if (acc.extraInfo) lines.push(`Ghi chú: ${acc.extraInfo}`)
  return lines.join('\n')
}

/**
 * Atomically assigns one available AccountStock to the given order,
 * sets deliveryContent + deliveryVisible, and sends the delivery email.
 *
 * Safe to call multiple times — idempotent if already delivered.
 * Never throws — returns an outcome string instead.
 */
export async function autoDelivery(orderId: string): Promise<DeliveryOutcome> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { product: true, plan: true, accountStock: true },
    })

    if (!order) return 'skip'
    if (order.paymentStatus !== 'paid') return 'skip'

    // Idempotency: already delivered
    if (order.deliveryStatus === 'delivered' || order.accountStock) return 'skip'

    type TxResult =
      | { outcome: 'out_of_stock' }
      | { outcome: 'delivered'; deliveryContent: string }

    const txResult: TxResult = await prisma.$transaction(async (tx) => {
      // Find the oldest available account for this product+plan
      const account = await tx.accountStock.findFirst({
        where: {
          productId: order.productId,
          planId: order.planId,
          status: 'available',
          orderId: null,
        },
        orderBy: { createdAt: 'asc' },
      })

      if (!account) {
        await tx.order.update({
          where: { id: orderId },
          data: { deliveryStatus: 'out_of_stock' },
        })
        return { outcome: 'out_of_stock' }
      }

      const now = new Date()
      const deliveryContent = buildDeliveryContent(account)

      // Mark account as sold — @unique orderId prevents double-assignment
      await tx.accountStock.update({
        where: { id: account.id },
        data: { status: 'sold', orderId, soldAt: now },
      })

      await tx.order.update({
        where: { id: orderId },
        data: {
          deliveryStatus: 'delivered',
          deliveryContent,
          deliveryVisible: true,
          deliveredAt: now,
          status: 'completed',
          completedAt: now,
        },
      })

      return { outcome: 'delivered', deliveryContent }
    })

    if (txResult.outcome === 'out_of_stock') {
      console.warn(`[autoDelivery] OUT OF STOCK — orderId=${orderId} product=${order.product.name} plan=${order.plan.name}`)
      return 'out_of_stock'
    }

    // Send email outside transaction (fire, then persist result)
    if (order.email) {
      const sent = await sendDeliveryEmail({
        to: order.email,
        orderCode: order.orderCode,
        customerName: order.customerName,
        productName: order.product.name,
        variantName: order.plan.name,
        amount: order.amount,
        deliveryContent: txResult.deliveryContent,
      })
      await prisma.order.update({
        where: { id: orderId },
        data: {
          emailStatus: sent ? 'sent' : 'failed',
          emailSentAt: sent ? new Date() : undefined,
        },
      })
    }

    return 'delivered'
  } catch (err) {
    console.error('[autoDelivery] error:', err instanceof Error ? err.message : err)
    return 'error'
  }
}
