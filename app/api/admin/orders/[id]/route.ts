import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { updateOrderSchema } from '@/lib/validators'

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        product: true,
        plan: true,
      },
    })
    if (!order) {
      return NextResponse.json({ error: 'Không tìm thấy đơn hàng' }, { status: 404 })
    }
    return NextResponse.json(order)
  } catch (error) {
    console.error('GET /api/admin/orders/[id] error:', error)
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const parsed = updateOrderSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dữ liệu không hợp lệ', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const order = await prisma.order.update({
      where: { id: params.id },
      data: {
        ...(parsed.data.status && { status: parsed.data.status }),
        ...(parsed.data.internalNote !== undefined && { internalNote: parsed.data.internalNote }),
      },
      include: {
        product: { select: { name: true, icon: true } },
        plan: { select: { name: true, price: true } },
      },
    })

    return NextResponse.json(order)
  } catch (error) {
    console.error('PATCH /api/admin/orders/[id] error:', error)
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
