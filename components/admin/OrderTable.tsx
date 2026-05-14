'use client'

import { useState } from 'react'
import { formatDate, formatPrice, ORDER_STATUS_MAP, CONTACT_METHOD_MAP } from '@/lib/utils'
import StatusBadge from './StatusBadge'
import { ChevronDown, Save, X, MessageSquare, Loader2 } from 'lucide-react'

const PAYMENT_STATUS_MAP: Record<string, { label: string; className: string }> = {
  pending: { label: 'Chưa TT', className: 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-400' },
  paid: { label: 'Đã TT', className: 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' },
  failed: { label: 'Thất bại', className: 'bg-red-500/10 border border-red-500/30 text-red-400' },
  expired: { label: 'Hết hạn', className: 'bg-slate-500/10 border border-slate-500/30 text-slate-400' },
}

interface Order {
  id: string
  orderCode: string
  customerName: string
  phone: string
  email: string | null
  contactMethod: string
  note: string | null
  status: string
  internalNote: string | null
  createdAt: string
  amount: number
  paymentStatus: string
  paymentProvider: string | null
  transactionId: string | null
  paidAmount: number | null
  paidAt: string | null
  product: { name: string; icon: string }
  plan: { name: string; price: number; duration: string }
}

interface OrderTableProps {
  orders: Order[]
  onRefresh: () => void
}

export default function OrderTable({ orders, onRefresh }: OrderTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)
  const [editNote, setEditNote] = useState<{ id: string; note: string } | null>(null)

  const updateOrder = async (id: string, data: { status?: string; internalNote?: string }) => {
    setUpdating(id)
    try {
      const res = await fetch(`/api/admin/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (res.ok) onRefresh()
    } finally {
      setUpdating(null)
      setEditNote(null)
    }
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-20 text-slate-500">
        <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>Chưa có đơn hàng nào</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {orders.map((order) => {
        const isExpanded = expandedId === order.id
        const isUpdating = updating === order.id

        return (
          <div
            key={order.id}
            className="bg-white/3 border border-white/10 rounded-xl overflow-hidden"
          >
            {/* Row */}
            <button
              onClick={() => setExpandedId(isExpanded ? null : order.id)}
              className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-white/5 transition-all"
            >
              <div className="shrink-0">
                <p className="text-cyan-400 font-mono text-sm font-bold">{order.orderCode}</p>
                <p className="text-slate-500 text-xs">{formatDate(order.createdAt)}</p>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold truncate">{order.customerName}</p>
                <p className="text-slate-400 text-sm">{order.phone}</p>
              </div>
              <div className="hidden sm:block shrink-0">
                <p className="text-white text-sm">
                  {order.product.icon} {order.product.name}
                </p>
                <p className="text-slate-400 text-xs">{order.plan.name}</p>
              </div>
              <div className="shrink-0 text-right hidden md:block">
                <p className="text-emerald-400 font-bold">{formatPrice(order.amount || order.plan.price)}</p>
              </div>
              <div className="shrink-0 flex flex-col gap-1 items-end">
                <StatusBadge status={order.status} />
                {(() => {
                  const ps = PAYMENT_STATUS_MAP[order.paymentStatus] || PAYMENT_STATUS_MAP.pending
                  return (
                    <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${ps.className}`}>
                      {ps.label}
                    </span>
                  )
                })()}
              </div>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                  isExpanded ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Expanded detail */}
            {isExpanded && (
              <div className="border-t border-white/10 px-5 py-5 space-y-5 bg-white/2">
                <div className="grid sm:grid-cols-2 gap-4">
                  {/* Customer info */}
                  <div className="space-y-2">
                    <h4 className="text-slate-400 text-xs font-semibold uppercase tracking-wide">Thông tin khách</h4>
                    {[
                      { label: 'Họ tên', value: order.customerName },
                      { label: 'Điện thoại', value: order.phone },
                      { label: 'Email', value: order.email || '—' },
                      { label: 'Liên hệ qua', value: CONTACT_METHOD_MAP[order.contactMethod] || order.contactMethod },
                      { label: 'Ghi chú', value: order.note || '—' },
                    ].map((item) => (
                      <div key={item.label} className="flex gap-2 text-sm">
                        <span className="text-slate-500 shrink-0 w-24">{item.label}:</span>
                        <span className="text-slate-200">{item.value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Order info */}
                  <div className="space-y-2">
                    <h4 className="text-slate-400 text-xs font-semibold uppercase tracking-wide">Chi tiết đơn</h4>
                    {[
                      { label: 'Sản phẩm', value: `${order.product.icon} ${order.product.name}` },
                      { label: 'Gói', value: `${order.plan.name} (${order.plan.duration})` },
                      { label: 'Cần TT', value: formatPrice(order.amount || order.plan.price) },
                      { label: 'Đã TT', value: order.paidAmount ? formatPrice(order.paidAmount) : '—' },
                      { label: 'Cổng TT', value: order.paymentProvider || '—' },
                      { label: 'Mã GD', value: order.transactionId || '—' },
                      { label: 'Thời gian TT', value: order.paidAt ? formatDate(order.paidAt) : '—' },
                      { label: 'Mã đơn', value: order.orderCode },
                      { label: 'Ngày đặt', value: formatDate(order.createdAt) },
                    ].map((item) => (
                      <div key={item.label} className="flex gap-2 text-sm">
                        <span className="text-slate-500 shrink-0 w-24">{item.label}:</span>
                        <span className="text-slate-200">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Status update */}
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-slate-400 text-sm">Cập nhật trạng thái:</span>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(ORDER_STATUS_MAP).map(([key, val]) => (
                      <button
                        key={key}
                        onClick={() => updateOrder(order.id, { status: key })}
                        disabled={isUpdating || order.status === key}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all disabled:opacity-50 ${
                          order.status === key
                            ? `${val.color} opacity-100`
                            : 'border-white/10 text-slate-400 hover:border-white/30 hover:text-white'
                        }`}
                      >
                        {isUpdating && order.status !== key ? (
                          <Loader2 className="w-3 h-3 animate-spin inline" />
                        ) : (
                          val.label
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Internal note */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-400 text-sm">Ghi chú nội bộ:</span>
                    {editNote?.id !== order.id && (
                      <button
                        onClick={() => setEditNote({ id: order.id, note: order.internalNote || '' })}
                        className="text-cyan-400 text-xs hover:underline"
                      >
                        Chỉnh sửa
                      </button>
                    )}
                  </div>

                  {editNote?.id === order.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={editNote.note}
                        onChange={(e) => setEditNote({ ...editNote, note: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-400/50 resize-none"
                        placeholder="Nhập ghi chú nội bộ..."
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateOrder(order.id, { internalNote: editNote.note })}
                          disabled={isUpdating}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-medium hover:bg-emerald-500/30 transition-all"
                        >
                          <Save className="w-3.5 h-3.5" />
                          Lưu
                        </button>
                        <button
                          onClick={() => setEditNote(null)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 text-xs hover:text-white transition-all"
                        >
                          <X className="w-3.5 h-3.5" />
                          Hủy
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-400 text-sm bg-white/3 rounded-xl px-3 py-2 min-h-[40px]">
                      {order.internalNote || 'Chưa có ghi chú'}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
