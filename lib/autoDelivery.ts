import { prisma } from '@/lib/prisma'
import { sendDeliveryEmail } from '@/lib/email'
import { decrypt } from '@/lib/security/encryption'

type DeliveryOutcome = 'delivered' | 'out_of_stock' | 'skip' | 'error'

function buildDeliveryContent(acc: {
  username: string
  password: string
  extraInfo: string
}): string {
  const password = decrypt(acc.password)
  const extraInfo = acc.extraInfo ? decrypt(acc.extraInfo) : ''
  const lines = [`Tài khoản: ${acc.username}`, `Mật khẩu: ${password}`]

  if (extraInfo) {
    // extraInfo format from import: "2FA_CODE" or "2FA_CODE|note" or plain note
    const pipeIdx = extraInfo.indexOf('|')
    if (pipeIdx !== -1) {
      // Split on first |: left = 2FA key, right = note
      const twofa = extraInfo.slice(0, pipeIdx).trim()
      const note = extraInfo.slice(pipeIdx + 1).trim()
      if (twofa) lines.push(`Mã 2FA: ${twofa}`)
      if (note) {
        const normalized = note.replace(/(?<![:/\w])2fa\.live\b/gi, 'https://2fa.live')
        lines.push(`Ghi chú: ${normalized}`)
      }
    } else if (/^[A-Za-z2-7]{16,}$/.test(extraInfo)) {
      // Looks like a TOTP base32 secret
      lines.push(`Mã 2FA: ${extraInfo}`)
    } else {
      const normalized = extraInfo.replace(/(?<![:/\w])2fa\.live\b/gi, 'https://2fa.live')
      lines.push(`Ghi chú: ${normalized}`)
    }
  }

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
      include: { product: true, plan: true, accountStocks: true },
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
    if (order.deliveryStatus === 'delivered' || order.accountStocks?.length > 0) {
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

      // Optimistic lock: update only if still 'available'; throws P2025 if another tx claimed it first
      await tx.accountStock.update({
        where: { id: account.id, status: 'available' },
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
