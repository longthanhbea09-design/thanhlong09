import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { guardObjectId } from '@/lib/db/real'

async function recomputePriceFrom(productId: string) {
  const plans = await prisma.productPlan.findMany({
    where: { productId, isActive: true },
    select: { price: true, available: true },
  })
  const available = plans.filter(p => p.available).map(p => p.price)
  const all = plans.map(p => p.price)
  const priceFrom = available.length > 0
    ? Math.min(...available)
    : all.length > 0 ? Math.min(...all) : 0
  if (priceFrom > 0) {
    await prisma.product.update({ where: { id: productId }, data: { priceFrom } })
  }
}

const VALID_SALE_MODES = ['AUTO_STOCK', 'FORCE_HIDDEN', 'PREORDER', 'MAINTENANCE'] as const

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  duration: z.string().min(1).optional(),
  type: z.string().optional(),
  price: z.number().min(0).optional(),
  warrantyText: z.string().optional(),
  description: z.string().optional().nullable(),
  badge: z.string().optional().nullable(),
  saleMode: z.enum(VALID_SALE_MODES).optional(),
  available: z.boolean().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const guard = guardObjectId(params.id)
  if (guard) return guard
  try {
    const body = await request.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dữ liệu không hợp lệ', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const variant = await prisma.productPlan.update({
      where: { id: params.id },
      data: parsed.data,
    })

    // Auto-recompute priceFrom from cheapest available plan
    await recomputePriceFrom(variant.productId)

    return NextResponse.json(variant)
  } catch (error) {
    console.error('PATCH /api/admin/variants/[id] error:', error)
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const guard = guardObjectId(params.id)
  if (guard) return guard
  try {
    const hasOrders = await prisma.order.findFirst({ where: { planId: params.id } })
    const plan = await prisma.productPlan.findUnique({ where: { id: params.id }, select: { productId: true } })
    if (hasOrders) {
      await prisma.productPlan.update({ where: { id: params.id }, data: { isActive: false } })
    } else {
      await prisma.productPlan.delete({ where: { id: params.id } })
    }
    if (plan) await recomputePriceFrom(plan.productId)
    return NextResponse.json({ message: hasOrders ? 'Đã ẩn option (có đơn hàng liên quan)' : 'Đã xóa option' })
  } catch (error) {
    console.error('DELETE /api/admin/variants/[id] error:', error)
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
