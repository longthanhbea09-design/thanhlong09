import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { guardObjectIds } from '@/lib/db/real'

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  price: z.number().min(0).optional(),
  description: z.string().optional(),
  available: z.boolean().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; variantId: string } }
) {
  const guard = guardObjectIds({ productId: params.id, variantId: params.variantId })
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

    // MongoDB requires where to be a single unique field — verify ownership separately
    const existing = await prisma.productPlan.findFirst({
      where: { id: params.variantId, productId: params.id },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Không tìm thấy option' }, { status: 404 })
    }

    const variant = await prisma.productPlan.update({
      where: { id: params.variantId },
      data: parsed.data,
    })
    return NextResponse.json(variant)
  } catch (error) {
    console.error('PATCH variant error:', error)
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string; variantId: string } }
) {
  const guard = guardObjectIds({ productId: params.id, variantId: params.variantId })
  if (guard) return guard
  try {
    const hasOrders = await prisma.order.findFirst({ where: { planId: params.variantId } })
    if (hasOrders) {
      await prisma.productPlan.update({
        where: { id: params.variantId },
        data: { isActive: false },
      })
      return NextResponse.json({ message: 'Đã ẩn option (có đơn hàng liên quan)' })
    }

    await prisma.productPlan.delete({ where: { id: params.variantId } })
    return NextResponse.json({ message: 'Đã xóa option' })
  } catch (error) {
    console.error('DELETE variant error:', error)
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
