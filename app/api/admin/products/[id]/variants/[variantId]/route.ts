import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

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
      where: { id: params.variantId, productId: params.id },
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
