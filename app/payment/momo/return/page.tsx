'use client'

/**
 * /payment/momo/return
 *
 * MoMo redirects customers here after payment (success or failure).
 * This page is display-only — it polls order status and shows the result.
 * Account delivery is handled exclusively by the IPN endpoint, never here.
 *
 * MoMo appends these params to the URL:
 *   partnerCode, orderId, requestId, amount, orderInfo, orderType,
 *   transId, resultCode, message, payType, responseTime, extraData, signature
 * We also have our own params: orderCode, token (set when building the redirectUrl)
 */

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  CheckCircle2, XCircle, RefreshCw, MessageCircle, AlertCircle,
} from 'lucide-react'
import { formatPrice } from '@/lib/utils'

interface OrderData {
  orderCode: string
  customerName: string
  productName: string
  planName: string
  amount: number
  paymentStatus: 'pending' | 'paid' | 'failed' | 'expired'
  deliveryStatus: string
  paidAt: string | null
}

export default function MomoReturnPage() {
  const searchParams = useSearchParams()

  // Our params (set in redirectUrl)
  const orderCode = searchParams.get('orderCode') ?? ''
  const token = searchParams.get('token') ?? ''

  // MoMo params
  const resultCode = Number(searchParams.get('resultCode') ?? '-1')
  const momoMessage = searchParams.get('message') ?? ''
  const transId = searchParams.get('transId') ?? ''

  const [order, setOrder] = useState<OrderData | null>(null)
  const [loading, setLoading] = useState(true)
  const [pollCount, setPollCount] = useState(0)

  const fetchOrder = useCallback(async () => {
    if (!orderCode) return
    try {
      const res = await fetch(`/api/orders/${orderCode}`)
      if (!res.ok) return
      setOrder(await res.json())
    } finally {
      setLoading(false)
    }
  }, [orderCode])

  useEffect(() => {
    fetchOrder()
  }, [fetchOrder])

  // Poll until paid+delivered (or fail out after 30s)
  useEffect(() => {
    if (!order) return
    const isDone =
      order.paymentStatus === 'paid' &&
      (order.deliveryStatus === 'delivered' || order.deliveryStatus === 'out_of_stock')
    const isExpired = order.paymentStatus === 'expired' || order.paymentStatus === 'failed'
    if (isDone || isExpired || pollCount >= 10) return

    const t = setTimeout(async () => {
      await fetchOrder()
      setPollCount((c) => c + 1)
    }, 3000)
    return () => clearTimeout(t)
  }, [order, pollCount, fetchOrder])

  // ── MoMo reported failure ─────────────────────────────────────────────────
  if (resultCode !== 0) {
    return (
      <div className="min-h-screen bg-[#050816] flex items-center justify-center px-4">
        <div className="max-w-md w-full glass rounded-3xl p-10 text-center border border-red-500/30 shadow-xl shadow-red-500/10">
          <div className="w-24 h-24 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-12 h-12 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Thanh toán thất bại</h1>
          <p className="text-slate-400 mb-2">
            {momoMessage || 'MoMo báo giao dịch không thành công.'}
          </p>
          <p className="text-slate-600 text-sm mb-6">
            Mã lỗi MoMo: <span className="font-mono text-slate-400">{resultCode}</span>
          </p>

          {orderCode && (
            <a
              href={`/checkout/${orderCode}${token ? `?token=${token}` : ''}`}
              className="inline-flex items-center justify-center gap-2 w-full py-3 mb-3 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-white font-bold hover:opacity-90 transition-all"
            >
              Thử lại thanh toán
            </a>
          )}
          <a href="/" className="block text-slate-400 hover:text-white text-sm mt-2 transition-colors">
            ← Về trang chủ
          </a>
        </div>
      </div>
    )
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#050816] flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-10 h-10 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-white font-semibold">Đang xác nhận thanh toán...</p>
          <p className="text-slate-400 text-sm mt-1">Vui lòng không đóng trang này.</p>
        </div>
      </div>
    )
  }

  // ── Order not found ───────────────────────────────────────────────────────
  if (!order) {
    return (
      <div className="min-h-screen bg-[#050816] flex items-center justify-center px-4">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <p className="text-white text-xl font-bold mb-2">Không tìm thấy đơn hàng</p>
          <a href="/orders/lookup" className="mt-4 inline-block text-cyan-400 hover:underline text-sm">
            Tra cứu đơn hàng →
          </a>
        </div>
      </div>
    )
  }

  // ── Paid: waiting for delivery ────────────────────────────────────────────
  if (order.paymentStatus === 'paid') {
    const isDelivered = order.deliveryStatus === 'delivered'
    const isOutOfStock = order.deliveryStatus === 'out_of_stock'
    const isDelivering = !isDelivered && !isOutOfStock

    return (
      <div className="min-h-screen bg-[#050816] flex items-center justify-center px-4">
        <div className="max-w-md w-full glass rounded-3xl p-10 text-center border border-emerald-500/30 shadow-xl shadow-emerald-500/10">
          <div className="w-24 h-24 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-12 h-12 text-emerald-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Thanh toán thành công!</h1>
          <p className="text-slate-400 mb-6">
            Đơn hàng <span className="text-cyan-400 font-bold">{order.orderCode}</span> đã được xác nhận.
          </p>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-5 text-left space-y-2 text-sm">
            <Row label="Sản phẩm" value={order.productName} />
            <Row label="Gói" value={order.planName} />
            <Row label="Số tiền" value={formatPrice(order.amount)} highlight />
            {transId && <Row label="Mã giao dịch MoMo" value={transId} mono />}
            {order.paidAt && (
              <Row label="Thanh toán lúc" value={new Date(order.paidAt).toLocaleString('vi-VN')} />
            )}
          </div>

          {isDelivered && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 mb-5 text-left">
              <p className="text-emerald-400 font-bold text-sm mb-1">🎉 Tài khoản đã được giao tự động!</p>
              <p className="text-slate-400 text-xs mb-3">
                Thông tin đã gửi vào email. Bấm để xem ngay:
              </p>
              <a
                href={`/order-success/${orderCode}?token=${token}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-semibold text-sm hover:bg-emerald-500/30 transition-all"
              >
                Xem thông tin tài khoản →
              </a>
            </div>
          )}

          {isOutOfStock && (
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4 mb-5 text-left">
              <p className="text-orange-300 font-bold text-sm mb-1">⚠️ Kho tạm hết hàng</p>
              <p className="text-slate-400 text-xs">
                Đơn đã thanh toán thành công. Shop sẽ liên hệ giao qua Zalo trong thời gian sớm nhất.
              </p>
            </div>
          )}

          {isDelivering && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 mb-5 text-left flex items-center gap-3">
              <RefreshCw className="w-4 h-4 text-blue-400 animate-spin shrink-0" />
              <div>
                <p className="text-blue-300 font-semibold text-sm">Hệ thống đang giao tài khoản...</p>
                <p className="text-slate-500 text-xs mt-0.5">Thường hoàn tất trong vài giây.</p>
              </div>
            </div>
          )}

          <a
            href="https://zalo.me/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-white/20 text-white hover:bg-white/5 transition-all text-sm"
          >
            <MessageCircle className="w-4 h-4" /> Nhắn Zalo hỗ trợ
          </a>
          <a href="/" className="mt-3 block text-slate-400 hover:text-white text-sm transition-colors">
            ← Về trang chủ
          </a>
        </div>
      </div>
    )
  }

  // ── Still pending after MoMo said success (IPN not yet processed) ─────────
  return (
    <div className="min-h-screen bg-[#050816] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <RefreshCw className="w-12 h-12 text-cyan-400 animate-spin mx-auto mb-5" />
        <h2 className="text-white text-xl font-bold mb-2">Đang xác nhận với MoMo...</h2>
        <p className="text-slate-400 text-sm mb-6">
          MoMo đã nhận thanh toán. Hệ thống đang chờ xác nhận cuối cùng.
        </p>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-left text-sm space-y-2 mb-6">
          <Row label="Mã đơn hàng" value={order.orderCode} mono />
          <Row label="Số tiền" value={formatPrice(order.amount)} highlight />
          {transId && <Row label="Mã GD MoMo" value={transId} mono />}
        </div>
        <p className="text-slate-500 text-xs">
          Trang này tự động cập nhật. Vui lòng không tắt trình duyệt.
        </p>
        <a href="/orders/lookup" className="mt-4 inline-block text-cyan-400 hover:underline text-sm">
          Tra cứu đơn hàng thủ công →
        </a>
      </div>
    </div>
  )
}

function Row({ label, value, highlight, mono }: {
  label: string; value: string; highlight?: boolean; mono?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-slate-400 shrink-0">{label}</span>
      <span className={`text-right font-medium ${highlight ? 'gradient-text font-bold text-base' : 'text-white'} ${mono ? 'font-mono text-xs' : ''}`}>
        {value}
      </span>
    </div>
  )
}
