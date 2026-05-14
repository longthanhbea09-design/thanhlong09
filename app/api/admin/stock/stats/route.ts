import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Count by productId + planId + status in one query
    const rows = await prisma.accountStock.groupBy({
      by: ['productId', 'planId', 'status'],
      _count: { id: true },
    })

    // Get all products + plans that appear in stock
    const productIds = Array.from(new Set(rows.map((r) => r.productId)))
    const planIds = Array.from(new Set(rows.map((r) => r.planId)))

    const [products, plans] = await Promise.all([
      prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true, icon: true },
      }),
      prisma.productPlan.findMany({
        where: { id: { in: planIds } },
        select: { id: true, name: true, price: true, productId: true },
      }),
    ])

    const productMap = Object.fromEntries(products.map((p) => [p.id, p]))
    const planMap = Object.fromEntries(plans.map((p) => [p.id, p]))

    // Group by productId + planId
    type PlanStats = {
      planId: string
      planName: string
      planPrice: number
      available: number
      sold: number
      disabled: number
    }

    type ProductStats = {
      productId: string
      productName: string
      productIcon: string
      plans: PlanStats[]
      totalAvailable: number
    }

    const grouped: Record<string, ProductStats> = {}

    for (const row of rows) {
      const product = productMap[row.productId]
      const plan = planMap[row.planId]
      if (!product || !plan) continue

      if (!grouped[row.productId]) {
        grouped[row.productId] = {
          productId: row.productId,
          productName: product.name,
          productIcon: product.icon,
          plans: [],
          totalAvailable: 0,
        }
      }

      let planEntry = grouped[row.productId].plans.find((p) => p.planId === row.planId)
      if (!planEntry) {
        planEntry = { planId: row.planId, planName: plan.name, planPrice: plan.price, available: 0, sold: 0, disabled: 0 }
        grouped[row.productId].plans.push(planEntry)
      }

      const count = row._count.id
      if (row.status === 'available') {
        planEntry.available += count
        grouped[row.productId].totalAvailable += count
      } else if (row.status === 'sold') {
        planEntry.sold += count
      } else if (row.status === 'disabled') {
        planEntry.disabled += count
      }
    }

    return NextResponse.json(Object.values(grouped))
  } catch (error) {
    console.error('GET /api/admin/stock/stats error:', error)
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
