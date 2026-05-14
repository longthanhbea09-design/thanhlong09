import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const variantSchema = z.object({
  name: z.string().min(1),
  duration: z.string().min(1),
  type: z.string().default(''),
  price: z.number().min(0),
  warrantyText: z.string().default('KBH'),
  description: z.string().optional().nullable(),
  badge: z.string().optional().nullable(),
  available: z.boolean().default(true),
  sortOrder: z.number().default(0),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const variants = await prisma.productPlan.findMany({
      where: { productId: params.id },
      orderBy: { sortOrder: 'asc' },
    })
    return NextResponse.json(variants)
  } catch (error) {
    console.error('GET variants error:', error)
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const parsed = variantSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dữ liệu không hợp lệ', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const variant = await prisma.productPlan.create({
      data: { ...parsed.data, productId: params.id, isActive: true },
    })
    return NextResponse.json(variant, { status: 201 })
  } catch (error) {
    console.error('POST variant error:', error)
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
