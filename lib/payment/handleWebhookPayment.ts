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
  const tag = `[processPayment] orderCode=${orderCode} txId=${transactionId} amount=${amount}`

  // ── 1. Order lookup ─────────────────────────────────────────────────────────
  const order = await prisma.order.findUnique({ where: { orderCode } })

  if (!order) {
    console.warn(`${tag} → ORDER_NOT_FOUND`)
    return { ok: false, message: 'Order not found' }
  }

  console.info(`${tag} → order found id=${order.id} paymentStatus=${order.paymentStatus} amount=${order.amount} provider=${order.paymentProvider}`)

  // ── 2. Already paid ─────────────────────────────────────────────────────────
  if (order.paymentStatus === 'paid') {
    console.info(`${tag} → ALREADY_PAID — skipping`)
    return { ok: true, message: 'Already paid' }
  }

  // ── 3. Expired ───────────────────────────────────────────────────────────────
  if (order.expiredAt && new Date() > order.expiredAt) {
    await prisma.order.update({
      where: { id: order.id },
      data: { paymentStatus: 'expired' },
    })
    console.warn(`${tag} → ORDER_EXPIRED expiredAt=${order.expiredAt.toISOString()}`)
    return { ok: false, message: 'Order expired' }
  }

  // ── 4. Duplicate transaction ──────────────────────────────────────────────────
  if (transactionId) {
    const existing = await prisma.paymentTransaction.findFirst({
      where: { transactionId },
    })
    if (existing) {
      console.info(`${tag} → DUPLICATE_TX existing orderId=${existing.orderId}`)
      return { ok: true, message: 'Duplicate transaction' }
    }
  }

  // ── 5. Amount check ──────────────────────────────────────────────────────────
  const paidAmount = Number(amount)
  const orderAmount = Number(order.amount)

  if (paidAmount < orderAmount) {
    await prisma.paymentTransaction.create({
      data: {
        orderId: order.id,
        provider,
        transactionId,
        amount: paidAmount,
        description,
        rawPayload,
        status: 'underpaid',
      },
    })
    console.warn(`${tag} → AMOUNT_MISMATCH paid=${paidAmount} expected=${orderAmount}`)
    return { ok: false, message: `Underpaid: got ${paidAmount}, expected ${orderAmount}` }
  }

  console.info(`${tag} → amount OK paid=${paidAmount} expected=${orderAmount}`)

  // ── 6. Update order to PAID + record transaction ──────────────────────────────
  try {
    await prisma.$transaction([
      prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: 'paid',
          status: 'paid',
          paidAmount,
          transactionId,
          paidAt: new Date(),
        },
      }),
      prisma.paymentTransaction.create({
        data: {
          orderId: order.id,
          provider,
          transactionId,
          amount: paidAmount,
          description,
          rawPayload,
          status: 'paid',
        },
      }),
    ])
    console.info(`${tag} → ORDER_MARKED_PAID`)
  } catch (txErr) {
    console.error(`${tag} → DB_TRANSACTION_FAILED:`, txErr instanceof Error ? txErr.message : txErr)
    return { ok: false, message: 'DB transaction failed' }
  }

  // ── 7. Auto-deliver ──────────────────────────────────────────────────────────
  const paymentSettings = await getPaymentSettings()

  if (!paymentSettings.autoDeliverAfterPaid) {
    console.info(`${tag} → AUTO_DELIVER disabled — order PAID, delivery pending manual`)
    return { ok: true, message: 'Payment confirmed (manual delivery mode)' }
  }

  console.info(`${tag} → calling autoDelivery orderId=${order.id}`)
  const deliveryOutcome = await autoDelivery(order.id)
  console.info(`${tag} → autoDelivery outcome=${deliveryOutcome}`)

  if (deliveryOutcome === 'delivered') {
    return { ok: true, message: 'Payment confirmed and account delivered' }
  }
  if (deliveryOutcome === 'out_of_stock') {
    return { ok: true, message: 'Payment confirmed but no stock available' }
  }
  if (deliveryOutcome === 'skip') {
    return { ok: true, message: 'Payment confirmed (delivery skipped — idempotent)' }
  }
  return { ok: true, message: `Payment confirmed (delivery outcome: ${deliveryOutcome})` }
}
