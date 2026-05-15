import { prisma } from '@/lib/prisma'
import { sendDeliveryEmail } from '@/lib/email'
import { decrypt } from '@/lib/security/encryption'

type DeliveryOutcome = 'delivered' | 'out_of_stock' | 'skip' | 'error'

function buildDeliveryContent(acc: {
  username: string
  password: string
  extraInfo: string
}): string {
  // Decrypt password and extraInfo — handles both encrypted (new) and plaintext (legacy) values
  const password = decrypt(acc.password)
  const extraInfo = acc.extraInfo ? decrypt(acc.extraInfo) : ''
  const lines = [`Tài khoản: ${acc.username}`, `Mật khẩu: ${password}`]
  if (extraInfo) lines.push(`Ghi chú: ${extraInfo}`)
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
  const tag = `[autoDelivery] orderId=${orderId}`
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { product: true, plan: true, accountStock: true },
    })

    if (!order) {
      console.warn(`${tag} → ORDER_NOT_FOUND`)
      return 'skip'
    }
    if (order.paymentStatus !== 'paid') {
      console.warn(`${tag} → SKIP paymentStatus=${order.paymentStatus} (must be paid)`)
      return 'skip'
    }

    // Idempotency: already delivered
    if (order.deliveryStatus === 'delivered' || order.accountStock) {
      console.info(`${tag} → ALREADY_DELIVERED deliveryStatus=${order.deliveryStatus}`)
      return 'skip'
    }

    console.info(`${tag} → searching stock for productId=${order.productId} planId=${order.planId}`)

    type TxResult =
      | { outcome: 'out_of_stock' }
      | { outcome: 'delivered'; deliveryContent: string }

    const txResult: TxResult = await prisma.$transaction(async (tx) => {
      // Find the oldest available account for this product+plan.
      // orderId: null is intentionally omitted — Prisma+MongoDB does not correctly
      // match null ObjectId fields in a WHERE clause. We verify orderId===null below.
      const account = await tx.accountStock.findFirst({
        where: {
          productId: order.productId,
          planId: order.planId,
          status: 'available',
        },
        orderBy: { createdAt: 'asc' },
      })

      if (!account || account.orderId !== null) {
        await tx.order.update({
          where: { id: orderId },
          data: { deliveryStatus: 'out_of_stock' },
        })
        console.warn(`${tag} → OUT_OF_STOCK no available account for product=${order.product.name} plan=${order.plan.name}`)
        return { outcome: 'out_of_stock' }
      }

      console.info(`${tag} → stock found accountId=${account.id}`)

      const now = new Date()
      // Decrypt before building delivery content — password may be encrypted
      const deliveryContent = buildDeliveryContent(account)

      // Mark account as sold — @unique orderId prevents double-assignment (race condition guard)
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

    console.info(`${tag} → DELIVERED successfully`)
    return 'delivered'
  } catch (err) {
    console.error(`${tag} → ERROR:`, err instanceof Error ? err.stack : err)
    return 'error'
  }
}
