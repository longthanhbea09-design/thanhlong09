'use client'

import { useEffect, useState } from 'react'
import AdminHeader from '@/components/admin/AdminHeader'
import StatusBadge from '@/components/admin/StatusBadge'
import RevenueChart from '@/components/admin/RevenueChart'
import { formatPrice, formatDate } from '@/lib/utils'
import { ShoppingBag, Package, TrendingUp, Clock, CheckCircle2, AlertCircle } from 'lucide-react'

interface DashboardData {
  orders: {
    total: number
    new: number
    processing: number
    completed: number
    cancelled: number
    recent: Array<{
      id: string
      orderCode: string
      customerName: string
      phone: string
      status: string
      createdAt: string
      product: { name: string; icon: string }
      plan: { price: number; name: string }
    }>
  }
  products: { total: number; active: number }
  revenue: number
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboard()
  }, [])

  const fetchDashboard = async () => {
    try {
      const [ordersRes, productsRes] = await Promise.all([
        fetch('/api/admin/orders?limit=5'),
        fetch('/api/admin/products'),
      ])

      const ordersData = await ordersRes.json()
      const productsData = await productsRes.json()

      const orders = ordersData.orders || []
      const revenue = orders
        .filter((o: { status: string }) => ['paid', 'processing', 'completed'].includes(o.status))
        .reduce((sum: number, o: { plan: { price: number } }) => sum + o.plan.price, 0)

      setData({
        orders: {
          total: ordersData.total || 0,
          new: orders.filter((o: { status: string }) => o.status === 'new').length,
          processing: orders.filter((o: { status: string }) => ['contacting', 'processing'].includes(o.status)).length,
          completed: orders.filter((o: { status: string }) => o.status === 'completed').length,
          cancelled: orders.filter((o: { status: string }) => o.status === 'cancelled').length,
          recent: orders,
        },
        products: {
          total: productsData.length || 0,
          active: productsData.filter((p: { isActive: boolean }) => p.isActive).length,
        },
        revenue,
      })
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const statCards = data
    ? [
        {
          label: 'Tổng đơn hàng',
          value: data.orders.total,
          icon: ShoppingBag,
          color: 'text-cyan-400',
          bg: 'bg-cyan-500/10',
          border: 'border-cyan-500/20',
        },
        {
          label: 'Đơn mới',
          value: data.orders.new,
          icon: Clock,
          color: 'text-blue-400',
          bg: 'bg-blue-500/10',
          border: 'border-blue-500/20',
        },
        {
          label: 'Đang xử lý',
          value: data.orders.processing,
          icon: AlertCircle,
          color: 'text-yellow-400',
          bg: 'bg-yellow-500/10',
          border: 'border-yellow-500/20',
        },
        {
          label: 'Hoàn thành',
          value: data.orders.completed,
          icon: CheckCircle2,
          color: 'text-emerald-400',
          bg: 'bg-emerald-500/10',
          border: 'border-emerald-500/20',
        },
        {
          label: 'Doanh thu ước tính',
          value: formatPrice(data.revenue),
          icon: TrendingUp,
          color: 'text-purple-400',
          bg: 'bg-purple-500/10',
          border: 'border-purple-500/20',
        },
        {
          label: 'Sản phẩm đang bán',
          value: `${data.products.active}/${data.products.total}`,
          icon: Package,
          color: 'text-orange-400',
          bg: 'bg-orange-500/10',
          border: 'border-orange-500/20',
        },
      ]
    : []

  return (
    <>
      <AdminHeader title="Tổng quan" adminEmail="admin@thanhlongshop.net" />
      <main className="flex-1 p-6 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Revenue chart */}
            <RevenueChart />

            {/* Stat cards */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {statCards.map((card, i) => (
                <div
                  key={i}
                  className={`glass rounded-2xl p-6 border ${card.border}`}
                >
                  <div className={`w-12 h-12 rounded-xl ${card.bg} flex items-center justify-center mb-4`}>
                    <card.icon className={`w-6 h-6 ${card.color}`} />
                  </div>
                  <p className={`text-2xl font-bold ${card.color} mb-1`}>{card.value}</p>
                  <p className="text-slate-400 text-sm">{card.label}</p>
                </div>
              ))}
            </div>

            {/* Recent orders */}
            <div className="glass rounded-2xl border border-white/10">
              <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                <h2 className="text-white font-bold text-lg">Đơn hàng gần đây</h2>
                <a href="/admin/orders" className="text-cyan-400 text-sm hover:underline">
                  Xem tất cả →
                </a>
              </div>

              {data?.orders.recent.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <ShoppingBag className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p>Chưa có đơn hàng</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {data?.orders.recent.map((order) => (
                    <div key={order.id} className="px-6 py-4 flex items-center gap-4 hover:bg-white/3 transition-all">
                      <div className="shrink-0">
                        <p className="text-cyan-400 font-mono text-sm font-bold">{order.orderCode}</p>
                        <p className="text-slate-500 text-xs">{formatDate(order.createdAt)}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">{order.customerName}</p>
                        <p className="text-slate-400 text-sm">{order.phone}</p>
                      </div>
                      <div className="hidden sm:block shrink-0 text-right">
                        <p className="text-white text-sm">
                          {order.product.icon} {order.product.name}
                        </p>
                        <p className="text-emerald-400 text-sm font-semibold">
                          {formatPrice(order.plan.price)}
                        </p>
                      </div>
                      <StatusBadge status={order.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </>
  )
}
