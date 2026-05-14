import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { productSchema } from '@/lib/validators'
import { securityLog } from '@/lib/securityLog'
import { getClientIp } from '@/lib/rateLimit'

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      include: {
        plans: { orderBy: { sortOrder: 'asc' } },
        _count: { select: { orders: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(products)
  } catch (error) {
    console.error('GET /api/admin/products error:', error)
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = productSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dữ liệu không hợp lệ', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const existing = await prisma.product.findUnique({ where: { slug: parsed.data.slug } })
    if (existing) {
      return NextResponse.json({ error: 'Slug đã tồn tại' }, { status: 409 })
    }

    const product = await prisma.product.create({ data: parsed.data })
    securityLog('PRODUCT_CREATED', { ip: getClientIp(request), productId: product.id, slug: product.slug })
    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    console.error('POST /api/admin/products error:', error)
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
