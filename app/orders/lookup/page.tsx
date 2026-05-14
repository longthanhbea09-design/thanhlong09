'use client'

import { useState } from 'react'
import { Search, CheckCircle2, Clock, AlertCircle, Copy, Check, MessageCircle, Zap, ArrowLeft, Package } from 'lucide-react'
import { formatPrice, formatDate, ORDER_STATUS_MAP } from '@/lib/utils'
import Link from 'next/link'

interface LookupOrder {
  orderCode: string
  customerName: string
  productName: string
  variantName: string
  amount: number
  paymentStatus: string
  status: string
  deliveryStatus: string
  createdAt: string
  paidAt: string | null
  completedAt: string | null
  deliveryContent: string | null
  // deliveryVisible intentionally not returned by API — prevents info leak
}

const PAYMENT_LABEL: Record<string, { label: string; color: string }> = {
  pending: { label: 'Chưa thanh toán', color: 'text-yellow-400' },
  paid: { label: 'Đã thanh toán', color: 'text-emerald-400' },
  failed: { label: 'Thất bại', color: 'text-red-400' },
  expired: { label: 'Hết hạn', color: 'text-slate-400' },
}

const inp = 'w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-400/50 transition-all'

export default function OrderLookupPage() {
  const [orderCode, setOrderCode] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<LookupOrder | null>(null)
  const [copied, setCopied] = useState(false)

  const canSubmit = orderCode.trim() && (phone.trim() || email.trim())

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setLoading(true)
    setError(null)
    setResult(null)
    const body: Record<string, string> = { orderCode: orderCode.trim() }
    if (phone.trim()) body.phone = phone.trim()
    if (email.trim()) body.email = email.trim()
    try {
      const res = await fetch('/api/orders/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Không tìm thấy đơn hàng.')
      } else {
        setResult(data.order)
      }
    } catch {
      setError('Không thể kết nối server. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  const copyDelivery = () => {
    if (!result?.deliveryContent) return
    navigator.clipboard.writeText(result.deliveryContent)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const paymentInfo = result ? (PAYMENT_LABEL[result.paymentStatus] || PAYMENT_LABEL.pending) : null
  const statusInfo = result ? (ORDER_STATUS_MAP[result.status] || ORDER_STATUS_MAP.new) : null

  return (
    <div className="min-h-screen bg-[#050816] py-12 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white">ThanhLong<span className="gradient-text">Shop</span></span>
          </Link>
          <h1 className="text-3xl font-bold text-white mb-2">Tra cứu đơn hàng</h1>
          <p className="text-slate-400">Nhập mã đơn và số điện thoại hoặc email để xem thông tin đơn hàng</p>
        </div>

        {/* Form */}
        <div className="glass rounded-2xl border border-white/10 p-6 mb-5">
          <form onSubmit={handleLookup} className="space-y-4">
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">Mã đơn hàng</label>
              <input
                value={orderCode}
                onChange={(e) => setOrderCode(e.target.value)}
                placeholder="VD: TLS-20240101-1234"
                className={inp}
                required
              />
            </div>
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">Số điện thoại / Zalo đã đặt hàng</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="VD: 0912345678"
                inputMode="numeric"
                className={inp}
              />
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-slate-500 text-xs">hoặc</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">Email đã đặt hàng</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="VD: you@gmail.com"
                className={inp}
              />
            </div>
            {error && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading || !canSubmit}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-white font-semibold transition-all disabled:opacity-50"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              {loading ? 'Đang tra cứu...' : 'Tra cứu đơn hàng'}
            </button>
          </form>
        </div>

        {/* Result */}
        {result && (
          <div className="space-y-4">
            {/* Order summary */}
            <div className="glass rounded-2xl border border-white/10 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Package className="w-4 h-4 text-cyan-400" />
                <p className="text-slate-300 text-sm font-semibold">Chi tiết đơn hàng</p>
              </div>
              <div className="space-y-3">
                {[
                  { label: 'Mã đơn', value: result.orderCode, mono: true },
                  { label: 'Khách hàng', value: result.customerName },
                  { label: 'Sản phẩm', value: result.productName },
                  { label: 'Gói', value: result.variantName },
                  { label: 'Ngày đặt', value: formatDate(result.createdAt) },
                  ...(result.paidAt ? [{ label: 'Ngày thanh toán', value: formatDate(result.paidAt) }] : []),
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-4">
                    <span className="text-slate-400 text-sm shrink-0">{item.label}</span>
                    <span className={`text-sm font-medium text-right ${item.mono ? 'font-mono text-cyan-400' : 'text-white'}`}>
                      {item.value}
                    </span>
                  </div>
                ))}
                <div className="border-t border-white/10 pt-3 flex items-center justify-between">
                  <span className="text-slate-400 text-sm">Số tiền</span>
                  <span className="gradient-text text-xl font-extrabold">{formatPrice(result.amount)}</span>
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="glass rounded-2xl border border-white/10 p-5 flex items-center gap-4">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-sm w-28 shrink-0">Thanh toán:</span>
                  <span className={`text-sm font-semibold ${paymentInfo?.color}`}>{paymentInfo?.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-sm w-28 shrink-0">Trạng thái:</span>
                  <span className={`text-sm font-semibold ${statusInfo?.color.split(' ').find(c => c.startsWith('text-'))}`}>
                    {statusInfo?.label}
                  </span>
                </div>
              </div>
              {result.paymentStatus === 'paid' ? (
                <CheckCircle2 className="w-8 h-8 text-emerald-400 shrink-0" />
              ) : (
                <Clock className="w-8 h-8 text-yellow-400 shrink-0" />
              )}
            </div>

            {/* Delivery status banners */}
            {result.paymentStatus === 'paid' && !result.deliveryContent && result.deliveryStatus === 'out_of_stock' && (
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-5 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-orange-300 font-semibold text-sm">Kho tạm hết hàng</p>
                  <p className="text-slate-400 text-xs mt-1">
                    Đơn đã thanh toán thành công. Shop đang bổ sung tài khoản và sẽ liên hệ giao sớm qua Zalo. Xin lỗi vì sự bất tiện này.
                  </p>
                </div>
              </div>
            )}
            {result.paymentStatus === 'paid' && !result.deliveryContent && result.deliveryStatus !== 'out_of_stock' && (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-5 flex items-start gap-3">
                <Clock className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-blue-300 font-semibold text-sm">Đang xử lý bàn giao</p>
                  <p className="text-slate-400 text-xs mt-1">
                    Đơn hàng đã thanh toán. Shop đang chuẩn bị thông tin và sẽ bàn giao sớm qua Zalo.
                  </p>
                </div>
              </div>
            )}

            {result.deliveryContent && (
              <div className="glass rounded-2xl border border-emerald-500/30 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <p className="text-emerald-400 font-semibold text-sm">Thông tin bàn giao</p>
                  </div>
                  <button
                    onClick={copyDelivery}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:text-white text-xs transition-all"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Đã copy' : 'Copy'}
                  </button>
                </div>
                <pre className="text-slate-200 text-sm whitespace-pre-wrap break-words bg-white/5 rounded-xl p-4 leading-relaxed">
                  {result.deliveryContent}
                </pre>
              </div>
            )}

            {/* Support link */}
            <a
              href="https://zalo.me/"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border border-white/20 text-slate-300 hover:text-white hover:border-white/40 hover:bg-white/5 transition-all text-sm"
            >
              <MessageCircle className="w-4 h-4" />
              Liên hệ hỗ trợ qua Zalo
            </a>

            {/* Search again */}
            <button
              onClick={() => { setResult(null); setOrderCode(''); setPhone(''); setEmail('') }}
              className="w-full flex items-center justify-center gap-2 text-slate-500 hover:text-white text-sm transition-colors py-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Tra cứu đơn khác
            </button>
          </div>
        )}

        <p className="text-center text-slate-600 text-xs mt-8">
          <Link href="/" className="hover:text-slate-400 transition-colors">← Về trang chủ</Link>
        </p>
      </div>
    </div>
  )
}
