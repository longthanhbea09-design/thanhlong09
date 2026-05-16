'use client'

import { useEffect, useState, useCallback } from 'react'
import AdminHeader from '@/components/admin/AdminHeader'
import OrderTable from '@/components/admin/OrderTable'
import { Search, RefreshCw } from 'lucide-react'
import { ORDER_STATUS_MAP } from '@/lib/utils'

const STATUS_FILTERS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'unpaid', label: 'Chưa thanh toán' },
  { value: 'paid', label: 'Đã thanh toán' },
  { value: 'completed', label: 'Đã hoàn thành' },
  { value: 'cancelled', label: 'Đã hủy' },
  ...Object.entries(ORDER_STATUS_MAP)
    .filter(([v]) => !['completed', 'cancelled'].includes(v))
    .map(([value, { label }]) => ({ value, label })),
]

export default function OrdersPage() {
  const [orders, setOrders] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '15',
        ...(status !== 'all' && { status }),
        ...(search && { search }),
      })
      const res = await fetch(`/api/admin/orders?${params}`)
      const data = await res.json()
      setOrders(data.orders || [])
      setTotal(data.total || 0)
      setTotalPages(data.pages || 1)
    } finally {
      setLoading(false)
    }
  }, [page, status, search])

  useEffect(() => {
    const timeout = setTimeout(fetchOrders, 300)
    return () => clearTimeout(timeout)
  }, [fetchOrders])

  return (
    <>
      <AdminHeader title="Quản lý đơn hàng" adminEmail="admin@longshop.net" />
      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-6xl mx-auto space-y-5">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm theo tên, SĐT, mã đơn..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-400/50 transition-all"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => { setStatus(f.value); setPage(1) }}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    status === f.value
                      ? 'bg-gradient-to-r from-cyan-500 to-emerald-500 text-white'
                      : 'bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <button
              onClick={fetchOrders}
              className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
              title="Làm mới"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <span className="text-slate-400 text-sm ml-auto">
              Tổng: <span className="text-white font-semibold">{total}</span> đơn
            </span>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <OrderTable orders={orders} onRefresh={fetchOrders} />
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${
                    page === p
                      ? 'bg-cyan-500 text-white'
                      : 'bg-white/5 border border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  )
}
