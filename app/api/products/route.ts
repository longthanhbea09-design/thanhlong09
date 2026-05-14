import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: {
        plans: {
          where: { isActive: true },
          orderBy: { price: 'asc' },
        },
      },
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'asc' }],
    })
    return NextResponse.json(products)
  } catch (error) {
    console.error('GET /api/products error:', error)
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
