import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const days = Math.min(parseInt(searchParams.get('days') || '30'), 90)

    const since = new Date()
    since.setDate(since.getDate() - days + 1)
    since.setHours(0, 0, 0, 0)

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const [allPaid, monthPaid] = await Promise.all([
      prisma.order.findMany({
        where: { paymentStatus: 'paid', paidAt: { gte: since } },
        select: { amount: true, paidAt: true },
      }),
      prisma.order.findMany({
        where: { paymentStatus: 'paid', paidAt: { gte: monthStart } },
        select: { amount: true },
      }),
    ])

    // Group by day (YYYY-MM-DD)
    const byDay = new Map<string, { revenue: number; orders: number }>()

    // Pre-fill all days with 0 so chart has no gaps
    for (let i = 0; i < days; i++) {
      const d = new Date(since)
      d.setDate(since.getDate() + i)
      const key = d.toISOString().slice(0, 10)
      byDay.set(key, { revenue: 0, orders: 0 })
    }

    for (const order of allPaid) {
      const key = (order.paidAt ?? new Date()).toISOString().slice(0, 10)
      const entry = byDay.get(key)
      if (entry) {
        entry.revenue += order.amount
        entry.orders += 1
      }
    }

    const chartData = Array.from(byDay.entries()).map(([date, v]) => ({
      date,
      revenue: v.revenue,
      orders: v.orders,
    }))

    const monthRevenue = monthPaid.reduce((s, o) => s + o.amount, 0)
    const monthOrders = monthPaid.length

    return NextResponse.json({ chartData, monthRevenue, monthOrders })
  } catch (error) {
    console.error('GET /api/admin/dashboard error:', error)
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
