import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSaleStatus } from '@/lib/saleStatus'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const [product, stockGroups] = await Promise.all([
      prisma.product.findFirst({
        where: { id: params.id, isActive: true },
        include: {
          plans: {
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
          },
        },
      }),
      prisma.accountStock.groupBy({
        by: ['planId'],
        where: { status: 'available', productId: params.id },
        _count: { id: true },
      }),
    ])

    if (!product) {
      return NextResponse.json({ error: 'Không tìm thấy sản phẩm' }, { status: 404 })
    }

    const stockMap = new Map(stockGroups.map((s) => [s.planId, s._count.id]))

    const enriched = {
      ...product,
      plans: product.plans.map((plan) => {
        const stockCount = stockMap.get(plan.id) ?? 0
        const saleStatus = getSaleStatus({
          planSaleMode: plan.saleMode,
          planAvailable: plan.available,
          stockCount,
        })
        return { ...plan, stockCount, saleStatus }
      }),
    }

    return NextResponse.json(enriched)
  } catch (error) {
    console.error('GET /api/products/[id] error:', error)
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
