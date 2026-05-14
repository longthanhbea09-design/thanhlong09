'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { TrendingUp, RefreshCw, ShoppingBag } from 'lucide-react'
import { formatPrice } from '@/lib/utils'

interface DayData {
  date: string
  revenue: number
  orders: number
}

interface ApiResponse {
  chartData: DayData[]
  monthRevenue: number
  monthOrders: number
}

function shortDate(iso: string) {
  const [, m, d] = iso.split('-')
  return `${parseInt(d)}/${parseInt(m)}`
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ value: number; payload: DayData }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  const { revenue, orders } = payload[0].payload
  return (
    <div className="bg-[#0d1224] border border-white/10 rounded-xl p-3 text-sm shadow-xl min-w-[160px]">
      <p className="text-slate-400 mb-2">{label}</p>
      <p className="text-emerald-400 font-bold">{formatPrice(revenue)}</p>
      <p className="text-slate-400 mt-1">{orders} đơn hàng</p>
    </div>
  )
}

export default function RevenueChart() {
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(30)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/dashboard?days=${days}`)
      if (res.ok) setData(await res.json())
    } finally {
      setLoading(false)
    }
  }, [days])

  useEffect(() => { load() }, [load])

  return (
    <div className="glass rounded-2xl border border-white/10 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-cyan-400" />
          <h2 className="text-white font-bold text-lg">Doanh thu ước tính</h2>
        </div>
        <div className="flex items-center gap-2">
          {([7, 30, 90] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                days === d
                  ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-400'
                  : 'bg-white/5 border border-white/10 text-slate-400 hover:text-white'
              }`}
            >
              {d === 7 ? '7 ngày' : d === 30 ? '30 ngày' : '90 ngày'}
            </button>
          ))}
          <button
            onClick={load}
            disabled={loading}
            className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Chart */}
      {loading ? (
        <div className="h-56 flex items-center justify-center">
          <div className="w-7 h-7 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data?.chartData ?? []} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={shortDate}
              tick={{ fill: '#64748b', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              interval={days === 7 ? 0 : days === 30 ? 4 : 13}
            />
            <YAxis
              tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v}
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

      {/* Month summary */}
      <div className="grid grid-cols-2 gap-4 mt-5 pt-5 border-t border-white/10">
        <div>
          <p className="text-slate-400 text-xs mb-1">Doanh thu tháng này</p>
          <p className="text-emerald-400 font-bold text-lg">{formatPrice(data?.monthRevenue ?? 0)}</p>
        </div>
        <div>
          <p className="text-slate-400 text-xs mb-1 flex items-center gap-1">
            <ShoppingBag className="w-3.5 h-3.5" />
            Đơn hàng tháng này
          </p>
          <p className="text-cyan-400 font-bold text-lg">{data?.monthOrders ?? 0} đơn</p>
        </div>
      </div>
    </div>
  )
}
