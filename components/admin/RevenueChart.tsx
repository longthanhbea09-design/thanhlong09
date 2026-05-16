'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import { TrendingUp, RefreshCw, ShoppingBag, ChevronLeft, ChevronRight } from 'lucide-react'
import { formatPrice } from '@/lib/utils'

// ── Types ────────────────────────────────────────────────────────────────────

interface DayPoint {
  date: string
  label: string  // "T2" … "CN" for week, "d/M" for days view
  revenue: number
  orders: number
}

interface WeekResponse {
  view: 'week'
  range: { start: string; end: string }
  chart: DayPoint[]
  totalRevenue: number
  totalOrders: number
}

interface DaysResponse {
  view: 'days'
  chartData: Array<{ date: string; revenue: number; orders: number }>
  monthRevenue: number
  monthOrders: number
}

type ApiResponse = WeekResponse | DaysResponse

// ── Helpers ──────────────────────────────────────────────────────────────────

// Get Monday's "YYYY-MM-DD" string in local (Vietnam) timezone, offset by N weeks
function getWeekStart(weekOffset: number): string {
  const now = new Date()
  const day = now.getDay() // 0=Sun, 1=Mon …
  const daysFromMonday = day === 0 ? 6 : day - 1
  const monday = new Date(now)
  monday.setDate(now.getDate() - daysFromMonday + weekOffset * 7)
  monday.setHours(0, 0, 0, 0)
  const y = monday.getFullYear()
  const m = String(monday.getMonth() + 1).padStart(2, '0')
  const d = String(monday.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// "YYYY-MM-DD" → "dd/MM/YYYY"
function fmtDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

// "YYYY-MM-DD" → "d/M"
function shortDate(iso: string): string {
  const [, m, d] = iso.split('-')
  return `${parseInt(d)}/${parseInt(m)}`
}

const DAY_FULL: Record<string, string> = {
  T2: 'Thứ 2', T3: 'Thứ 3', T4: 'Thứ 4', T5: 'Thứ 5',
  T6: 'Thứ 6', T7: 'Thứ 7', CN: 'Chủ nhật',
}

// ── Tooltip ──────────────────────────────────────────────────────────────────

function CustomTooltip({ active, payload }: {
  active?: boolean
  payload?: Array<{ payload: DayPoint }>
}) {
  if (!active || !payload?.length) return null
  const { label, date, revenue, orders } = payload[0].payload
  const dayFull = DAY_FULL[label] ?? label
  return (
    <div className="bg-[#0d1224] border border-white/10 rounded-xl p-3 text-sm shadow-xl min-w-[170px]">
      <p className="text-slate-300 font-medium mb-0.5">{dayFull}</p>
      <p className="text-slate-500 text-xs mb-2">{fmtDate(date)}</p>
      <p className="text-emerald-400 font-bold">{formatPrice(revenue)}</p>
      <p className="text-slate-400 mt-1">{orders} đơn hàng</p>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

type ViewTab = 'week' | '30days' | '90days'

export default function RevenueChart() {
  const [view, setView] = useState<ViewTab>('week')
  const [weekOffset, setWeekOffset] = useState(0)   // 0=this week, -1=last, …
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      let url: string
      if (view === 'week') {
        url = `/api/admin/dashboard?view=week&weekStart=${getWeekStart(weekOffset)}`
      } else {
        const days = view === '30days' ? 30 : 90
        url = `/api/admin/dashboard?days=${days}`
      }
      const res = await fetch(url)
      if (res.ok) setData(await res.json())
    } finally {
      setLoading(false)
    }
  }, [view, weekOffset])

  useEffect(() => { load() }, [load])

  // ── Derived data ────────────────────────────────────────────────────────
  const isWeek = data?.view === 'week'
  const weekData = isWeek ? (data as WeekResponse) : null
  const daysData = !isWeek ? (data as DaysResponse) : null

  const chartPoints: DayPoint[] = isWeek
    ? (weekData!.chart)
    : (daysData?.chartData ?? []).map((p) => ({
        ...p,
        label: shortDate(p.date),
      }))

  const summaryRevenue = isWeek ? weekData!.totalRevenue : daysData?.monthRevenue ?? 0
  const summaryOrders  = isWeek ? weekData!.totalOrders  : daysData?.monthOrders  ?? 0
  const summaryLabel   = isWeek
    ? (weekOffset === 0 ? 'Tuần này' : weekOffset === -1 ? 'Tuần trước' : `${Math.abs(weekOffset)} tuần trước`)
    : view === '30days' ? 'Tháng này' : '90 ngày qua'

  const weekRange = weekData
    ? `${fmtDate(weekData.range.start)} – ${fmtDate(weekData.range.end)}`
    : null

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="glass rounded-2xl border border-white/10 p-6">

      {/* ── Header row ── */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-cyan-400" />
          <h2 className="text-white font-bold text-lg">Doanh thu</h2>
        </div>

        <div className="flex items-center gap-2">
          {/* View tabs */}
          {(['week', '30days', '90days'] as ViewTab[]).map((v) => (
            <button
              key={v}
              onClick={() => { setView(v); if (v === 'week') setWeekOffset(0) }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                view === v
                  ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-400'
                  : 'bg-white/5 border border-white/10 text-slate-400 hover:text-white'
              }`}
            >
              {v === 'week' ? 'Tuần' : v === '30days' ? '30 ngày' : '90 ngày'}
            </button>
          ))}

          {/* Refresh */}
          <button
            onClick={load}
            disabled={loading}
            className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Week navigator (only in week view) ── */}
      {view === 'week' && (
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={() => setWeekOffset((o) => o - 1)}
            disabled={weekOffset <= -12}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white disabled:opacity-30 transition-all text-xs"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Tuần trước
          </button>

          <div className="text-center">
            <p className="text-white text-sm font-semibold">
              {weekOffset === 0 ? 'Tuần này' : weekOffset === -1 ? 'Tuần trước' : `${Math.abs(weekOffset)} tuần trước`}
            </p>
            {weekRange && <p className="text-slate-500 text-xs mt-0.5">{weekRange}</p>}
          </div>

          <button
            onClick={() => setWeekOffset((o) => o + 1)}
            disabled={weekOffset >= 0}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white disabled:opacity-30 transition-all text-xs"
          >
            Tuần sau <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── Chart ── */}
      {loading ? (
        <div className="h-56 flex items-center justify-center">
          <div className="w-7 h-7 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartPoints} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#06b6d4" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: '#64748b', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              interval={view === 'week' ? 0 : view === '30days' ? 4 : 13}
            />
            <YAxis
              tickFormatter={(v) =>
                v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M`
                : v >= 1_000   ? `${(v / 1_000).toFixed(0)}K`
                : String(v)
              }
              tick={{ fill: '#64748b', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={48}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#06b6d4"
              strokeWidth={2}
              fill="url(#revenueGrad)"
              dot={false}
              activeDot={{ r: 4, fill: '#06b6d4', strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}

      {/* ── Summary stats ── */}
      <div className="grid grid-cols-2 gap-4 mt-5 pt-5 border-t border-white/10">
        <div>
          <p className="text-slate-400 text-xs mb-1">Doanh thu {summaryLabel}</p>
          <p className="text-emerald-400 font-bold text-lg">{formatPrice(summaryRevenue)}</p>
        </div>
        <div>
          <p className="text-slate-400 text-xs mb-1 flex items-center gap-1">
            <ShoppingBag className="w-3.5 h-3.5" />
            Đơn hàng {summaryLabel}
          </p>
          <p className="text-cyan-400 font-bold text-lg">{summaryOrders} đơn</p>
        </div>
      </div>
    </div>
  )
}
