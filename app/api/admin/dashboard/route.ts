import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const VN_OFFSET_MS = 7 * 60 * 60 * 1000 // UTC+7

const DAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

// Add 7h to UTC timestamp → get Vietnam local date string "YYYY-MM-DD"
function utcToVnDateStr(utcDate: Date): string {
  return new Date(utcDate.getTime() + VN_OFFSET_MS).toISOString().slice(0, 10)
}

// "YYYY-MM-DD" (VN date) → UTC Date at 00:00 Vietnam time
function vnDateStrToUtcStart(vnDateStr: string): Date {
  const [y, m, d] = vnDateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d) - VN_OFFSET_MS)
}

// ── Week view ────────────────────────────────────────────────────────────────
async function getWeekData(weekStart: string) {
  // weekStart = "YYYY-MM-DD" Monday in Vietnam timezone
  const [y, m, d] = weekStart.split('-').map(Number)

  // Build the 7 VN dates for this week (Mon–Sun)
  const weekDates: string[] = []
  for (let i = 0; i < 7; i++) {
    const dt = new Date(y, m - 1, d + i)
    const ds = [
      dt.getFullYear(),
      String(dt.getMonth() + 1).padStart(2, '0'),
      String(dt.getDate()).padStart(2, '0'),
    ].join('-')
    weekDates.push(ds)
  }

  const weekEnd = weekDates[6]

  const utcFrom = vnDateStrToUtcStart(weekStart)             // Mon 00:00 VN in UTC
  const utcTo   = new Date(vnDateStrToUtcStart(weekEnd).getTime() + 24 * 60 * 60 * 1000) // Sun 24:00 VN

  const orders = await prisma.order.findMany({
    where: { paymentStatus: 'paid', paidAt: { gte: utcFrom, lt: utcTo } },
    select: { amount: true, paidAt: true },
  })

  // Aggregate by VN date
  const byDate = new Map<string, { revenue: number; orders: number }>()
  for (const ds of weekDates) byDate.set(ds, { revenue: 0, orders: 0 })

  for (const o of orders) {
    const ds = utcToVnDateStr(o.paidAt ?? new Date())
    const entry = byDate.get(ds)
    if (entry) { entry.revenue += o.amount; entry.orders += 1 }
  }

  const chart = weekDates.map((ds, i) => ({
    date: ds,
    label: DAY_LABELS[i],
    revenue: byDate.get(ds)!.revenue,
    orders: byDate.get(ds)!.orders,
  }))

  const totalRevenue = chart.reduce((s, c) => s + c.revenue, 0)
  const totalOrders  = chart.reduce((s, c) => s + c.orders, 0)

  return NextResponse.json({
    view: 'week',
    range: { start: weekStart, end: weekEnd },
    chart,
    totalRevenue,
    totalOrders,
  })
}

// ── Days view (30 / 90) ──────────────────────────────────────────────────────
async function getDaysData(days: number) {
  // Compute VN "today" date string
  const vnToday = utcToVnDateStr(new Date())
  const [ty, tm, td] = vnToday.split('-').map(Number)

  const sinceDateObj = new Date(ty, tm - 1, td - days + 1)
  const sinceStr = [
    sinceDateObj.getFullYear(),
    String(sinceDateObj.getMonth() + 1).padStart(2, '0'),
    String(sinceDateObj.getDate()).padStart(2, '0'),
  ].join('-')
  const utcFrom = vnDateStrToUtcStart(sinceStr)
  const utcTo   = new Date(vnDateStrToUtcStart(vnToday).getTime() + 24 * 60 * 60 * 1000)

  const vnMonthStart = `${ty}-${String(tm).padStart(2, '0')}-01`
  const utcMonthFrom = vnDateStrToUtcStart(vnMonthStart)

  const [rangeOrders, monthOrders] = await Promise.all([
    prisma.order.findMany({
      where: { paymentStatus: 'paid', paidAt: { gte: utcFrom, lt: utcTo } },
      select: { amount: true, paidAt: true },
    }),
    prisma.order.findMany({
      where: { paymentStatus: 'paid', paidAt: { gte: utcMonthFrom, lt: utcTo } },
      select: { amount: true },
    }),
  ])

  // Build date list
  const dates: string[] = []
  for (let i = 0; i < days; i++) {
    const dt = new Date(sinceDateObj)
    dt.setDate(sinceDateObj.getDate() + i)
    dates.push([
      dt.getFullYear(),
      String(dt.getMonth() + 1).padStart(2, '0'),
      String(dt.getDate()).padStart(2, '0'),
    ].join('-'))
  }

  const byDate = new Map<string, { revenue: number; orders: number }>()
  for (const ds of dates) byDate.set(ds, { revenue: 0, orders: 0 })

  for (const o of rangeOrders) {
    const ds = utcToVnDateStr(o.paidAt ?? new Date())
    const entry = byDate.get(ds)
    if (entry) { entry.revenue += o.amount; entry.orders += 1 }
  }

  const chartData = dates.map((ds) => ({ date: ds, ...byDate.get(ds)! }))
  const monthRevenue = monthOrders.reduce((s, o) => s + o.amount, 0)

  return NextResponse.json({
    view: 'days',
    chartData,
    monthRevenue,
    monthOrders: monthOrders.length,
  })
}

// ── Handler ──────────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const view = searchParams.get('view')

    if (view === 'week') {
      const weekStart = searchParams.get('weekStart')
      if (!weekStart || !/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
        return NextResponse.json({ error: 'weekStart required (YYYY-MM-DD)' }, { status: 400 })
      }
      return getWeekData(weekStart)
    }

    // Default: days view (backward compat)
    const days = Math.min(parseInt(searchParams.get('days') || '30'), 90)
    return getDaysData(days)
  } catch (error) {
    console.error('GET /api/admin/dashboard error:', error)
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
