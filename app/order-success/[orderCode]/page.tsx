'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import {
  CheckCircle2, Clock, Copy, Check, RefreshCw,
  MessageCircle, AlertCircle, Package, Zap,
} from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import Link from 'next/link'

interface DeliveryData {
  orderCode: string
  customerName: string
  productName: string
  planName: string
  amount: number
  paymentStatus: string
  deliveryStatus: string
  deliveredAt: string | null
  paidAt: string | null
  deliveryContent: string | null
}

export default function OrderSuccessPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const orderCode = params.orderCode as string
  const token = searchParams.get('token') ?? ''

  const [data, setData] = useState<DeliveryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const fetchDelivery = useCallback(async () => {
    if (!token) {
      setError('Liên kết không hợp lệ. Vui lòng dùng liên kết từ trang thanh toán.')
      setLoading(false)
      return
    }
    try {
      const res = await fetch(`/api/orders/${orderCode}/delivery?token=${token}`)
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setError(json.error || 'Không tìm thấy đơn hàng')
        setLoading(false)
        return
      }
      const json = await res.json()
      setData(json)
    } catch {
      setError('Không thể kết nối server')
    } finally {
      setLoading(false)
    }
  }, [orderCode, token])

  useEffect(() => { fetchDelivery() }, [fetchDelivery])

  // Poll until delivered or out_of_stock
  useEffect(() => {
    if (!data) return
    const isDone =
      data.paymentStatus === 'paid' &&
      (data.deliveryStatus === 'delivered' || data.deliveryStatus === 'out_of_stock')
    if (isDone) return
    const interval = setInterval(fetchDelivery, 3000)
    return () => clearInterval(interval)
  }, [data, fetchDelivery])

  const copyContent = () => {
    if (!data?.deliveryContent) return
    navigator.clipboard.writeText(data.deliveryContent)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050816] flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#050816] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-white text-xl font-bold mb-2">Không tìm thấy đơn hàng</h1>
          <p className="text-slate-400 text-sm mb-6">{error}</p>
          <div className="flex flex-col gap-3">
            <Link
              href="/orders/lookup"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-white font-semibold text-sm"
            >
              Tra cứu đơn hàng
            </Link>
            <Link href="/" className="text-slate-400 hover:text-white text-sm transition-colors">
              ← Về trang chủ
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const isDelivered = data.deliveryStatus === 'delivered' && !!data.deliveryContent
  const isOutOfStock = data.deliveryStatus === 'out_of_stock'
  const isDelivering = data.paymentStatus === 'paid' && !isDelivered && !isOutOfStock
  const isPending = data.paymentStatus !== 'paid'

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

          {isDelivered ? (
            <>
              <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-1">Hoàn tất!</h1>
              <p className="text-slate-400">Đơn hàng đã được giao thành công</p>
            </>
          ) : isOutOfStock ? (
            <>
              <div className="w-20 h-20 rounded-full bg-orange-500/20 flex items-center justify-center mx-auto mb-4">
                <Package className="w-10 h-10 text-orange-400" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-1">Thanh toán thành công</h1>
              <p className="text-slate-400">Đang chờ bổ sung kho hàng</p>
            </>
          ) : isDelivering ? (
            <>
              <div className="w-20 h-20 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-4">
                <RefreshCw className="w-10 h-10 text-blue-400 animate-spin" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-1">Đang giao tài khoản...</h1>
              <p className="text-slate-400">Thường hoàn tất trong vài giây</p>
            </>
          ) : (
            <>
              <div className="w-20 h-20 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-4">
                <Clock className="w-10 h-10 text-yellow-400" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-1">Chờ xác nhận thanh toán</h1>
              <p className="text-slate-400">Đơn hàng chưa được xác nhận thanh toán</p>
            </>
          )}
        </div>

        {/* Order info */}
        <div className="glass rounded-2xl border border-white/10 p-6 mb-5">
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-4 h-4 text-cyan-400" />
            <p className="text-slate-300 text-sm font-semibold">Chi tiết đơn hàng</p>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Mã đơn', value: data.orderCode, mono: true },
              { label: 'Khách hàng', value: data.customerName },
              { label: 'Sản phẩm', value: data.productName },
              { label: 'Gói', value: data.planName },
              ...(data.paidAt ? [{ label: 'Thanh toán lúc', value: new Date(data.paidAt).toLocaleString('vi-VN') }] : []),
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between gap-4">
                <span className="text-slate-400 text-sm shrink-0">{row.label}</span>
                <span className={`text-sm font-medium text-right ${row.mono ? 'font-mono text-cyan-400' : 'text-white'}`}>
                  {row.value}
                </span>
              </div>
            ))}
            <div className="border-t border-white/10 pt-3 flex items-center justify-between">
              <span className="text-slate-400 text-sm">Số tiền</span>
              <span className="gradient-text text-xl font-extrabold">{formatPrice(data.amount)}</span>
            </div>
          </div>
        </div>

        {/* Delivery content */}
        {isDelivered && data.deliveryContent && (
          <div className="glass rounded-2xl border border-emerald-500/30 p-6 mb-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <p className="text-emerald-400 font-semibold text-sm">Thông tin tài khoản</p>
              </div>
              <button
                onClick={copyContent}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:text-white text-xs transition-all"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Đã copy' : 'Copy'}
              </button>
            </div>
            <pre className="text-slate-200 text-sm whitespace-pre-wrap break-words bg-white/5 rounded-xl p-4 leading-relaxed font-mono">
              {data.deliveryContent}
            </pre>
            <p className="text-slate-500 text-xs mt-3">
              Lưu lại thông tin này. Bạn cũng có thể tra cứu lại tại{' '}
              <Link href="/orders/lookup" className="text-cyan-400 hover:underline">
                /orders/lookup
              </Link>
            </p>
          </div>
        )}

        {/* Status banners */}
        {isOutOfStock && (
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-5 mb-5 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-orange-300 font-semibold text-sm">Kho tạm hết hàng</p>
              <p className="text-slate-400 text-xs mt-1">
                Thanh toán đã được xác nhận. Shop đang bổ sung tài khoản và sẽ giao sớm qua Zalo. Xin lỗi vì sự bất tiện.
              </p>
            </div>
          </div>
        )}

        {isDelivering && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 mb-5 flex items-center gap-3">
            <RefreshCw className="w-4 h-4 text-blue-400 animate-spin shrink-0" />
            <div>
              <p className="text-blue-300 font-semibold text-sm">Đang giao tài khoản tự động...</p>
              <p className="text-slate-500 text-xs mt-0.5">Trang sẽ tự cập nhật khi có tài khoản.</p>
            </div>
          </div>
        )}

        {isPending && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4 mb-5 flex items-center gap-3">
            <Clock className="w-4 h-4 text-yellow-400 shrink-0" />
            <p className="text-yellow-300 text-sm">
              Hệ thống chưa nhận được xác nhận thanh toán. Nếu đã chuyển khoản, vui lòng chờ vài phút.
            </p>
          </div>
        )}

        {/* Support link */}
        <a
          href={`https://zalo.me/${process.env.NEXT_PUBLIC_ZALO || ''}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 py-4 rounded-xl btn-primary text-base mb-3"
        >
          <MessageCircle className="w-5 h-5" />
          Nhắn Zalo hỗ trợ
        </a>

        <Link
          href="/orders/lookup"
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 transition-all text-sm"
        >
          Tra cứu lại đơn hàng
        </Link>

        <Link href="/" className="mt-4 block text-center text-slate-500 hover:text-white text-sm transition-colors">
          ← Về trang chủ
        </Link>
      </div>
    </div>
  )
}
