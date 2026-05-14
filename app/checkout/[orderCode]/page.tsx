'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { CheckCircle2, Clock, Copy, RefreshCw, MessageCircle, AlertCircle } from 'lucide-react'
import { formatPrice } from '@/lib/utils'

interface OrderData {
  orderCode: string
  customerName: string
  productName: string
  planName: string
  amount: number
  paymentStatus: 'pending' | 'paid' | 'failed' | 'expired'
  paymentUrl: string | null
  qrCode: string | null
  paymentProvider: string | null
  paidAt: string | null
  expiredAt: string | null
}

const ZALO = process.env.NEXT_PUBLIC_ZALO || '0924555517'
const BANK_NAME = 'MB Bank'
const BANK_ACCOUNT = '0924555517'
const BANK_OWNER = 'NGUYEN THANH LONG'

export default function CheckoutPage() {
  const params = useParams()
  const orderCode = params.orderCode as string

  const [order, setOrder] = useState<OrderData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)

  const fetchOrder = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders/${orderCode}`)
      if (!res.ok) { setError('Không tìm thấy đơn hàng'); return }
      const data = await res.json()
      setOrder(data)
    } catch {
      setError('Không thể tải thông tin đơn hàng')
    } finally {
      setLoading(false)
    }
  }, [orderCode])

  useEffect(() => {
    fetchOrder()
  }, [fetchOrder])

  // Poll mỗi 5 giây khi đang chờ thanh toán
  useEffect(() => {
    if (!order || order.paymentStatus === 'paid') return
    const interval = setInterval(fetchOrder, 5000)
    return () => clearInterval(interval)
  }, [order, fetchOrder])

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  // Nút "Tôi đã thanh toán" → trigger kiểm tra lại
  const handleConfirm = async () => {
    setConfirming(true)
    await fetchOrder()
    setConfirming(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050816] flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-[#050816] flex items-center justify-center px-4">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <p className="text-white text-xl font-bold mb-2">Không tìm thấy đơn hàng</p>
          <p className="text-slate-400">{error}</p>
          <a href="/" className="mt-6 inline-block text-cyan-400 hover:underline">← Về trang chủ</a>
        </div>
      </div>
    )
  }

  if (order.paymentStatus === 'paid') {
    return (
      <div className="min-h-screen bg-[#050816] flex items-center justify-center px-4">
        <div className="max-w-md w-full glass rounded-3xl p-10 text-center border border-emerald-500/30 shadow-xl shadow-emerald-500/10">
          <div className="w-24 h-24 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-12 h-12 text-emerald-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Thanh toán thành công!</h1>
          <p className="text-slate-400 mb-6">
            Đơn hàng <span className="text-cyan-400 font-bold">{order.orderCode}</span> đã được xác nhận.
            ThanhLongShop sẽ liên hệ với bạn trong vài phút.
          </p>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-6 text-left space-y-2">
            <Row label="Sản phẩm" value={order.productName} />
            <Row label="Gói" value={order.planName} />
            <Row label="Số tiền" value={formatPrice(order.amount)} highlight />
            {order.paidAt && (
              <Row label="Thanh toán lúc" value={new Date(order.paidAt).toLocaleString('vi-VN')} />
            )}
          </div>

          <a
            href={`https://zalo.me/${ZALO}`}
            target="_blank" rel="noopener noreferrer"
            className="w-full btn-primary py-4 text-base justify-center"
          >
            <MessageCircle className="w-5 h-5" />
            Nhắn Zalo để nhận dịch vụ
          </a>
          <a href="/" className="mt-4 block text-slate-500 hover:text-white text-sm transition-colors">
            ← Về trang chủ
          </a>
        </div>
      </div>
    )
  }

  const transferContent = orderCode

  return (
    <div className="min-h-screen bg-[#050816] py-12 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <a href="/" className="text-slate-400 hover:text-white text-sm mb-4 inline-block transition-colors">
            ← ThanhLongShop
          </a>
          <h1 className="text-3xl font-bold text-white">Thanh toán đơn hàng</h1>
          <p className="text-slate-400 mt-1">Chuyển khoản để hoàn tất mua hàng</p>
        </div>

        {/* Order Summary */}
        <div className="glass rounded-2xl p-6 border border-white/10 mb-5">
          <p className="text-slate-400 text-sm font-medium mb-4">Chi tiết đơn hàng</p>
          <div className="space-y-3">
            <Row label="Mã đơn hàng" value={order.orderCode} mono />
            <Row label="Sản phẩm" value={order.productName} />
            <Row label="Gói" value={order.planName} />
            <div className="border-t border-white/10 pt-3 mt-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Số tiền cần thanh toán</span>
                <span className="gradient-text text-2xl font-extrabold">{formatPrice(order.amount)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* QR & Bank Info */}
        <div className="glass rounded-2xl p-6 border border-cyan-500/20 mb-5">
          <p className="text-slate-400 text-sm font-medium mb-5">Thông tin chuyển khoản</p>

          {/* QR Code */}
          {order.qrCode && (
            <div className="flex justify-center mb-6">
              <div className="bg-white p-3 rounded-2xl">
                <img
                  src={order.qrCode}
                  alt="QR thanh toán"
                  width={200}
                  height={200}
                  className="block"
                />
              </div>
            </div>
          )}

          {/* Bank Details */}
          <div className="space-y-3">
            <BankRow label="Ngân hàng" value={BANK_NAME} />
            <BankRow
              label="Số tài khoản"
              value={BANK_ACCOUNT}
              copyKey="account"
              copied={copied}
              onCopy={() => copy(BANK_ACCOUNT, 'account')}
            />
            <BankRow label="Chủ tài khoản" value={BANK_OWNER} />
            <BankRow
              label="Số tiền"
              value={formatPrice(order.amount)}
              copyKey="amount"
              copied={copied}
              onCopy={() => copy(order.amount.toString(), 'amount')}
            />
            <BankRow
              label="Nội dung CK"
              value={transferContent}
              copyKey="content"
              copied={copied}
              onCopy={() => copy(transferContent, 'content')}
              highlight
            />
          </div>
        </div>

        {/* Warning */}
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4 mb-5 flex gap-3">
          <Clock className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-yellow-300 font-semibold text-sm mb-1">Nhập đúng nội dung chuyển khoản!</p>
            <p className="text-slate-400 text-xs leading-relaxed">
              Nội dung chuyển khoản phải chứa mã đơn <span className="text-white font-mono font-bold">{orderCode}</span> để hệ thống tự xác nhận.
              Đơn hàng sẽ tự động cập nhật sau khi thanh toán.
            </p>
          </div>
        </div>

        {/* Status */}
        <div className="glass rounded-2xl p-5 border border-white/10 mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-yellow-400 animate-pulse" />
            <span className="text-white font-medium">Đang chờ thanh toán...</span>
          </div>
          <button onClick={fetchOrder} className="text-slate-400 hover:text-white transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* CTA */}
        <button
          onClick={handleConfirm}
          disabled={confirming}
          className="w-full btn-primary py-4 text-base justify-center mb-3 disabled:opacity-60"
        >
          {confirming ? <RefreshCw className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
          {confirming ? 'Đang kiểm tra...' : 'Tôi đã chuyển khoản xong'}
        </button>

        <a
          href={`https://zalo.me/${ZALO}`}
          target="_blank" rel="noopener noreferrer"
          className="w-full btn-secondary py-4 text-base justify-center block text-center"
        >
          <MessageCircle className="w-5 h-5 inline mr-2" />
          Liên hệ hỗ trợ qua Zalo
        </a>
      </div>
    </div>
  )
}

function Row({ label, value, highlight, mono }: { label: string; value: string; highlight?: boolean; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-slate-400 text-sm shrink-0">{label}</span>
      <span className={`text-right text-sm font-medium ${highlight ? 'gradient-text font-bold text-base' : 'text-white'} ${mono ? 'font-mono' : ''}`}>
        {value}
      </span>
    </div>
  )
}

function BankRow({
  label, value, copyKey, copied, onCopy, highlight,
}: {
  label: string
  value: string
  copyKey?: string
  copied?: string | null
  onCopy?: () => void
  highlight?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-slate-400 text-sm shrink-0">{label}</span>
      <div className="flex items-center gap-2">
        <span className={`text-sm font-medium ${highlight ? 'text-cyan-400 font-mono font-bold' : 'text-white'}`}>
          {value}
        </span>
        {onCopy && (
          <button onClick={onCopy} className="text-slate-500 hover:text-cyan-400 transition-colors">
            <Copy className="w-3.5 h-3.5" />
          </button>
        )}
        {copied === copyKey && (
          <span className="text-emerald-400 text-xs">Đã copy!</span>
        )}
      </div>
    </div>
  )
}
