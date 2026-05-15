import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { paymentMethodSchema } from '@/lib/validators'

export async function GET() {
  try {
    const methods = await prisma.paymentMethod.findMany({
      where: { type: 'EWALLET' },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    })
    return NextResponse.json(methods)
  } catch (error) {
    console.error('GET /api/admin/payment-methods error:', error)
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = paymentMethodSchema.safeParse({ ...body, type: 'EWALLET' })
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dữ liệu không hợp lệ', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }
    const method = await prisma.paymentMethod.create({ data: parsed.data })
    return NextResponse.json(method, { status: 201 })
  } catch (error) {
    console.error('POST /api/admin/payment-methods error:', error)
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
