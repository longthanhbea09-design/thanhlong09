'use client'

import { useState, useCallback } from 'react'
import { formatDate, formatPrice, ORDER_STATUS_MAP, CONTACT_METHOD_MAP } from '@/lib/utils'
import { DEFAULT_DELIVERY_TEMPLATE, renderDelivery } from '@/lib/delivery'
import StatusBadge from './StatusBadge'
import DeliveryContent from '@/components/DeliveryContent'
import { ChevronDown, Save, X, MessageSquare, Loader2, Eye, EyeOff, Copy, Check, ToggleLeft, ToggleRight, CheckCircle2, Mail, RefreshCw, BadgeCheck } from 'lucide-react'

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
  deliveryContent: string | null
  deliveryVisible: boolean
  emailStatus: string | null
  emailSentAt: string | null
  product: { name: string; icon: string }
  plan: { name: string; price: number; duration: string }
}

interface OrderTableProps {
  orders: Order[]
  onRefresh: () => void
}

interface DeliveryEdit {
  id: string
  content: string
  visible: boolean
}

interface ShopSettings {
  shopName: string
  zalo: string
  deliveryTemplate: string | null
}

export default function OrderTable({ orders, onRefresh }: OrderTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)
  const [editNote, setEditNote] = useState<{ id: string; note: string } | null>(null)
  const [editDelivery, setEditDelivery] = useState<DeliveryEdit | null>(null)
  const [savingDelivery, setSavingDelivery] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState<string | null>(null)
  const [settings, setSettings] = useState<ShopSettings | null>(null)
  const [copiedMsg, setCopiedMsg] = useState<string | null>(null)
  const [resendingEmail, setResendingEmail] = useState<string | null>(null)
  const [localEmailStatus, setLocalEmailStatus] = useState<Record<string, string>>({})
  const [confirmingPayment, setConfirmingPayment] = useState<string | null>(null)

  const fetchSettings = useCallback(async () => {
    if (settings) return
    try {
      const res = await fetch('/api/admin/settings')
      if (res.ok) setSettings(await res.json())
    } catch { /* ignore */ }
  }, [settings])

  const updateOrder = async (id: string, data: Record<string, unknown>) => {
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

  const saveDelivery = async (order: Order) => {
    if (!editDelivery) return
    setSavingDelivery(order.id)
    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deliveryContent: editDelivery.content,
          deliveryVisible: editDelivery.visible,
        }),
      })
      if (res.ok) {
        onRefresh()
        setEditDelivery(null)
      }
    } finally {
      setSavingDelivery(null)
    }
  }

  const markCompleted = async (order: Order) => {
    await updateOrder(order.id, {
      status: 'completed',
      completedAt: new Date().toISOString(),
    })
  }

  const getPreviewText = (order: Order, content: string) => {
    const template = settings?.deliveryTemplate || DEFAULT_DELIVERY_TEMPLATE
    return renderDelivery(template, {
      orderCode: order.orderCode,
      productName: `${order.product.icon} ${order.product.name}`,
      variantName: order.plan.name,
      amount: order.amount,
      createdAt: order.createdAt,
      paidAt: order.paidAt,
      customerName: order.customerName,
      phone: order.phone,
      deliveryContent: content,
      shopName: settings?.shopName || 'ThanhLongShop',
      zaloPhone: settings?.zalo || '',
    })
  }

  const copyMsg = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopiedMsg(key)
    setTimeout(() => setCopiedMsg(null), 2000)
  }

  const confirmPayment = async (order: Order) => {
    setConfirmingPayment(order.id)
    try {
      await fetch(`/api/admin/orders/${order.id}/confirm-payment`, { method: 'POST' })
      onRefresh()
    } finally {
      setConfirmingPayment(null)
    }
  }

  const resendEmail = async (order: Order) => {
    setResendingEmail(order.id)
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/resend-email`, { method: 'POST' })
      const json = await res.json()
      setLocalEmailStatus((prev) => ({ ...prev, [order.id]: json.emailStatus ?? 'failed' }))
    } catch {
      setLocalEmailStatus((prev) => ({ ...prev, [order.id]: 'failed' }))
    } finally {
      setResendingEmail(null)
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
                      { label: 'Liên hệ qua', value: CONTACT_METHOD_MAP[order.contactMethod] || order.contactMethod },
                      { label: 'Ghi chú', value: order.note || '—' },
                    ].map((item) => (
                      <div key={item.label} className="flex gap-2 text-sm">
                        <span className="text-slate-500 shrink-0 w-24">{item.label}:</span>
                        <span className="text-slate-200">{item.value}</span>
                      </div>
                    ))}
                    {/* Email row with status and resend */}
                    <div className="flex gap-2 text-sm flex-wrap items-center">
                      <span className="text-slate-500 shrink-0 w-24">Email:</span>
                      <span className="text-slate-200">{order.email || '—'}</span>
                      {order.email && (() => {
                        const emailStatus = localEmailStatus[order.id] ?? order.emailStatus
                        const canResend = order.deliveryContent && order.paymentStatus === 'paid'
                        const badge = emailStatus === 'sent'
                          ? <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs"><Mail className="w-3 h-3" />Đã gửi</span>
                          : emailStatus === 'failed'
                          ? <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-500/10 border border-red-500/30 text-red-400 text-xs"><Mail className="w-3 h-3" />Gửi lỗi</span>
                          : <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-500/10 border border-slate-500/30 text-slate-400 text-xs"><Mail className="w-3 h-3" />Chưa gửi</span>
                        return (
                          <div className="flex items-center gap-2 flex-wrap">
                            {badge}
                            {canResend && (
                              <button
                                onClick={() => resendEmail(order)}
                                disabled={resendingEmail === order.id}
                                className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs hover:bg-cyan-500/20 transition-all disabled:opacity-50"
                              >
                                {resendingEmail === order.id
                                  ? <Loader2 className="w-3 h-3 animate-spin" />
                                  : <RefreshCw className="w-3 h-3" />
                                }
                                Gửi lại
                              </button>
                            )}
                            {emailStatus === 'sent' && order.emailSentAt && (
                              <span className="text-slate-500 text-xs">{formatDate(order.emailSentAt)}</span>
                            )}
                          </div>
                        )
                      })()}
                    </div>
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

                {/* Delivery content */}
                <div className="border-t border-white/10 pt-5">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-slate-300 text-sm font-semibold">Nội dung bàn giao cho khách</h4>
                    {editDelivery?.id !== order.id && (
                      <button
                        onClick={() => {
                          setEditDelivery({ id: order.id, content: order.deliveryContent || '', visible: order.deliveryVisible })
                          fetchSettings()
                        }}
                        className="text-cyan-400 text-xs hover:underline"
                      >
                        {order.deliveryContent ? 'Chỉnh sửa' : 'Nhập nội dung'}
                      </button>
                    )}
                  </div>

                  {editDelivery?.id === order.id ? (
                    <div className="space-y-3">
                      <textarea
                        value={editDelivery.content}
                        onChange={(e) => setEditDelivery({ ...editDelivery, content: e.target.value })}
                        rows={5}
                        className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-400/50 resize-none font-mono"
                        placeholder={'email@example.com | password123\nBackup code: 12345678'}
                      />

                      {/* Visible toggle */}
                      <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/10">
                        <div>
                          <p className="text-white text-sm font-medium">Cho khách xem nội dung bàn giao</p>
                          <p className="text-slate-500 text-xs">Khách tra cứu đúng mã đơn + SĐT mới thấy</p>
                        </div>
                        <button
                          onClick={() => setEditDelivery({ ...editDelivery, visible: !editDelivery.visible })}
                          className="flex items-center gap-1.5"
                        >
                          {editDelivery.visible
                            ? <ToggleRight className="w-7 h-7 text-emerald-400" />
                            : <ToggleLeft className="w-7 h-7 text-slate-500" />
                          }
                        </button>
                      </div>

                      {/* Preview */}
                      {editDelivery.content && showPreview === order.id && (
                        <div className="rounded-xl bg-black/30 border border-white/10 p-3">
                          <p className="text-slate-500 text-xs mb-2">Preview tin nhắn gửi khách:</p>
                          <pre className="text-slate-300 text-xs whitespace-pre-wrap leading-relaxed">
                            {getPreviewText(order, editDelivery.content)}
                          </pre>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => saveDelivery(order)}
                          disabled={savingDelivery === order.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-medium hover:bg-emerald-500/30 transition-all"
                        >
                          {savingDelivery === order.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                          Lưu bàn giao
                        </button>
                        {editDelivery.content && (
                          <button
                            onClick={() => setShowPreview(showPreview === order.id ? null : order.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 text-xs hover:text-white transition-all"
                          >
                            {showPreview === order.id ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            {showPreview === order.id ? 'Ẩn preview' : 'Xem preview'}
                          </button>
                        )}
                        {editDelivery.content && (
                          <button
                            onClick={() => copyMsg(getPreviewText(order, editDelivery.content), `msg-${order.id}`)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 text-xs hover:text-white transition-all"
                          >
                            {copiedMsg === `msg-${order.id}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            Copy tin nhắn
                          </button>
                        )}
                        <button
                          onClick={() => { setEditDelivery(null); setShowPreview(null) }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 text-xs hover:text-white transition-all"
                        >
                          <X className="w-3 h-3" />
                          Hủy
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      {order.deliveryContent ? (
                        <div className="space-y-2">
                          <DeliveryContent
                            content={order.deliveryContent}
                            className="text-slate-300 text-sm bg-white/3 rounded-xl px-3 py-2 whitespace-pre-wrap font-mono"
                          />
                          <div className="flex items-center gap-3">
                            <span className={`flex items-center gap-1 text-xs font-medium ${order.deliveryVisible ? 'text-emerald-400' : 'text-slate-500'}`}>
                              {order.deliveryVisible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                              {order.deliveryVisible ? 'Khách đang xem được' : 'Khách chưa xem được'}
                            </span>
                            <button
                              onClick={() => copyMsg(order.deliveryContent!, `del-${order.id}`)}
                              className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors"
                            >
                              {copiedMsg === `del-${order.id}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                              Copy
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-slate-600 text-sm italic">Chưa có nội dung bàn giao</p>
                      )}
                    </div>
                  )}

                  {/* Admin confirm payment — for manual bank/ewallet transfers */}
                  {order.paymentStatus === 'pending' && (
                    <div className="mt-3 pt-3 border-t border-white/5">
                      <div className="flex items-start gap-3 p-3 rounded-xl bg-yellow-500/5 border border-yellow-500/20">
                        <div className="flex-1">
                          <p className="text-yellow-300 text-xs font-semibold mb-0.5">Xác nhận thanh toán thủ công</p>
                          <p className="text-slate-500 text-xs">Chỉ bấm sau khi đã kiểm tra khách đã chuyển đủ tiền.</p>
                        </div>
                        <button
                          onClick={() => confirmPayment(order)}
                          disabled={confirmingPayment === order.id}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-yellow-500/15 border border-yellow-500/30 text-yellow-300 text-xs font-semibold hover:bg-yellow-500/25 transition-all disabled:opacity-50 shrink-0"
                        >
                          {confirmingPayment === order.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <BadgeCheck className="w-3.5 h-3.5" />
                          }
                          {confirmingPayment === order.id ? 'Đang xử lý...' : 'Xác nhận đã TT'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Mark completed */}
                  {order.status !== 'completed' && order.paymentStatus === 'paid' && (
                    <div className="mt-3 pt-3 border-t border-white/5">
                      <button
                        onClick={() => markCompleted(order)}
                        disabled={isUpdating}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-sm font-medium hover:bg-emerald-500/25 transition-all"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Đánh dấu hoàn thành
                      </button>
                    </div>
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
