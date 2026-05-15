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

interface ProcessPaymentResult {
  ok: boolean
  message: string
  status: string
  // ORDER_NOT_FOUND | ALREADY_PAID | EXPIRED | DUPLICATE | UNDERPAID | PAID | ERROR
}

export async function processPaymentWebhook({
  orderCode,
  amount,
  transactionId,
  description,
  provider,
  rawPayload,
}: ProcessPaymentParams): Promise<ProcessPaymentResult> {
  const tag = `[processPayment] orderCode=${orderCode} txId=${transactionId} amount=${amount}`

  // ── 1. Order lookup ─────────────────────────────────────────────────────────
  const order = await prisma.order.findUnique({ where: { orderCode } })

  if (!order) {
    console.warn(`${tag} → [ORDER_NOT_FOUND]`)
    return { ok: false, message: 'Order not found', status: 'ORDER_NOT_FOUND' }
  }

  console.log(
    `${tag} → [ORDER_FOUND] id=${order.id} paymentStatus=${order.paymentStatus} amount=${order.amount} provider=${order.paymentProvider}`
  )

  // ── 2. Already paid ─────────────────────────────────────────────────────────
  if (order.paymentStatus === 'paid') {
    console.log(`${tag} → [ALREADY_PAID] — skipping`)
    return { ok: true, message: 'Already paid', status: 'ALREADY_PAID' }
  }

  // ── 3. Expired ───────────────────────────────────────────────────────────────
  if (order.expiredAt && new Date() > order.expiredAt) {
    await prisma.order.update({
      where: { id: order.id },
      data: { paymentStatus: 'expired' },
    })
    console.warn(`${tag} → [ORDER_EXPIRED] expiredAt=${order.expiredAt.toISOString()}`)
    return { ok: false, message: 'Order expired', status: 'EXPIRED' }
  }

  // ── 4. Duplicate transaction ──────────────────────────────────────────────────
  if (transactionId) {
    const existing = await prisma.paymentTransaction.findFirst({
      where: { transactionId },
    })
    if (existing) {
      console.log(`${tag} → [TRANSACTION_ALREADY_EXISTS] existingOrderId=${existing.orderId}`)
      return { ok: true, message: 'Duplicate transaction', status: 'DUPLICATE' }
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
    console.warn(`${tag} → [AMOUNT_MISMATCH] paid=${paidAmount} expected=${orderAmount}`)
    return {
      ok: false,
      message: `Underpaid: got ${paidAmount}, expected ${orderAmount}`,
      status: 'AMOUNT_MISMATCH',
    }
  }

  console.log(`${tag} → [AMOUNT_MATCH] paid=${paidAmount} expected=${orderAmount}`)

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
    console.log(`${tag} → [ORDER_MARKED_PAID] paymentStatus=paid paidAmount=${paidAmount}`)
    console.log(`${tag} → [TRANSACTION_CREATED] transactionId=${transactionId}`)
  } catch (txErr) {
    const msg = txErr instanceof Error ? txErr.message : String(txErr)
    console.error(`${tag} → [DB_TRANSACTION_FAILED]:`, msg)
    return { ok: false, message: 'DB transaction failed', status: 'ERROR' }
  }

  // ── 7. Auto-deliver ──────────────────────────────────────────────────────────
  const paymentSettings = await getPaymentSettings()

  if (!paymentSettings.autoDeliverAfterPaid) {
    console.log(`${tag} → [AUTO_DELIVERY_DISABLED] order PAID, delivery pending manual`)
    return { ok: true, message: 'Payment confirmed (manual delivery mode)', status: 'PAID' }
  }

  console.log(`${tag} → [AUTO_DELIVERY_STARTED] orderId=${order.id}`)
  const deliveryOutcome = await autoDelivery(order.id)
  console.log(`${tag} → [AUTO_DELIVERY_${deliveryOutcome === 'delivered' ? 'SUCCESS' : 'RESULT'}] outcome=${deliveryOutcome}`)

  if (deliveryOutcome === 'delivered') {
    return { ok: true, message: 'Payment confirmed and account delivered', status: 'PAID' }
  }
  if (deliveryOutcome === 'out_of_stock') {
    return { ok: true, message: 'Payment confirmed but no stock available', status: 'PAID' }
  }
  if (deliveryOutcome === 'skip') {
    return { ok: true, message: 'Payment confirmed (delivery skipped — idempotent)', status: 'PAID' }
  }
  return { ok: true, message: `Payment confirmed (delivery outcome: ${deliveryOutcome})`, status: 'PAID' }
}
