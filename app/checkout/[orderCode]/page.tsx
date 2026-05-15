'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import {
  CheckCircle2, Clock, Copy, RefreshCw, MessageCircle, AlertCircle,
} from 'lucide-react'
import { formatPrice } from '@/lib/utils'

interface MbBankInfo {
  bankName: string | null
  accountNumber: string | null
  accountName: string | null
  paymentContent: string | null
  qrCodeUrl: string | null
}

interface OrderData {
  orderCode: string
  customerName: string
  productName: string
  planName: string
  amount: number
  paymentStatus: 'pending' | 'paid' | 'failed' | 'expired'
  paymentProvider: string | null  // 'MOMO' | 'MB_BANK'
  paymentUrl: string | null
  qrCode: string | null
  paidAt: string | null
  expiredAt: string | null
  status: string
  deliveryStatus: string
  mbBankInfo: MbBankInfo | null
}

interface ShopSettings {
  zalo: string
  zaloLink: string | null
}

export default function CheckoutPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const orderCode = params.orderCode as string
  const accessToken = searchParams.get('token') ?? ''

  const [order, setOrder] = useState<OrderData | null>(null)
  const [shopSettings, setShopSettings] = useState<ShopSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)

  const fetchOrder = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders/${orderCode}`)
      if (!res.ok) { setError('Không tìm thấy đơn hàng'); return }
      setOrder(await res.json())
    } catch {
      setError('Không thể tải thông tin đơn hàng')
    } finally {
      setLoading(false)
    }
  }, [orderCode])

  useEffect(() => {
    fetchOrder()
    fetch('/api/settings', { cache: 'no-store' })
      .then((r) => r.json())
      .then(setShopSettings)
      .catch(() => {})
  }, [fetchOrder])

  // Poll while pending / delivering
  useEffect(() => {
    if (!order) return
    const isDone =
      order.paymentStatus === 'paid' &&
      (order.deliveryStatus === 'delivered' || order.deliveryStatus === 'out_of_stock')
    if (isDone) return
    const interval = setInterval(fetchOrder, order.paymentStatus === 'paid' ? 2000 : 5000)
    return () => clearInterval(interval)
  }, [order, fetchOrder])

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

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

  const zaloHref = shopSettings?.zaloLink || `https://zalo.me/${shopSettings?.zalo || ''}`

  // ─── PAID ───────────────────────────────────────────────────────────────────
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

          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-5 text-left space-y-2">
            <InfoRow label="Sản phẩm" value={order.productName} />
            <InfoRow label="Gói" value={order.planName} />
            <InfoRow label="Số tiền" value={formatPrice(order.amount)} highlight />
            {order.paidAt && (
              <InfoRow label="Thanh toán lúc" value={new Date(order.paidAt).toLocaleString('vi-VN')} />
            )}
          </div>

          {isDelivered && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 mb-5 text-left">
              <p className="text-emerald-400 font-bold text-sm mb-1">🎉 Tài khoản đã được giao tự động!</p>
              <p className="text-slate-400 text-xs mb-3">
                Thông tin tài khoản đã gửi vào email của bạn. Bấm để xem ngay:
              </p>
              {accessToken ? (
                <a
                  href={`/order-success/${orderCode}?token=${accessToken}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-semibold text-sm hover:bg-emerald-500/30 transition-all"
                >
                  Xem thông tin tài khoản →
                </a>
              ) : (
                <a href="/orders/lookup" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-semibold text-sm hover:bg-emerald-500/30 transition-all">
                  Tra cứu đơn hàng →
                </a>
              )}
            </div>
          )}

          {isOutOfStock && (
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4 mb-5 text-left">
              <p className="text-orange-300 font-bold text-sm mb-1">⚠️ Kho tạm hết hàng</p>
              <p className="text-slate-400 text-xs">
                Đơn đã thanh toán thành công. Shop đang bổ sung và sẽ liên hệ giao qua Zalo.
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

          <a href={zaloHref} target="_blank" rel="noopener noreferrer"
            className="w-full btn-primary py-4 text-base justify-center">
            <MessageCircle className="w-5 h-5" /> Nhắn Zalo hỗ trợ
          </a>
          <a href="/orders/lookup" className="mt-3 block text-center text-slate-400 hover:text-white text-sm transition-colors">
            Tra cứu lại đơn hàng
          </a>
          <a href="/" className="mt-2 block text-slate-500 hover:text-white text-sm transition-colors text-center">
            ← Về trang chủ
          </a>
        </div>
      </div>
    )
  }

  // ─── PENDING ─────────────────────────────────────────────────────────────────
  const isMomo = order.paymentProvider === 'MOMO'
  const mb = order.mbBankInfo

  return (
    <div className="min-h-screen bg-[#050816] py-12 px-4">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <a href="/" className="text-slate-400 hover:text-white text-sm mb-4 inline-block transition-colors">
            ← ThanhLongShop
          </a>
          <h1 className="text-3xl font-bold text-white">Thanh toán đơn hàng</h1>
          <p className="text-slate-400 mt-1">
            {isMomo ? 'Thanh toán qua ví MoMo' : 'Chuyển khoản ngân hàng'}
          </p>
        </div>

        {/* Order summary */}
        <div className="glass rounded-2xl p-6 border border-white/10 mb-5">
          <p className="text-slate-400 text-sm font-medium mb-4">Chi tiết đơn hàng</p>
          <div className="space-y-3">
            <InfoRow label="Mã đơn hàng" value={order.orderCode} mono />
            <InfoRow label="Sản phẩm" value={order.productName} />
            <InfoRow label="Gói" value={order.planName} />
            <div className="border-t border-white/10 pt-3 mt-3 flex items-center justify-between">
              <span className="text-slate-400">Số tiền cần thanh toán</span>
              <span className="gradient-text text-2xl font-extrabold">{formatPrice(order.amount)}</span>
            </div>
          </div>
        </div>

        {/* ── MOMO payment block ── */}
        {isMomo && (
          <div className="glass rounded-2xl p-6 border border-purple-500/20 mb-5">
            <p className="text-slate-400 text-sm font-medium mb-5">Thanh toán qua MoMo</p>

            {/* QR Code */}
            {order.qrCode && (
              <div className="flex justify-center mb-6">
                <div className="bg-white p-3 rounded-2xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={order.qrCode} alt="QR MoMo" width={200} height={200} className="block" />
                </div>
              </div>
            )}

            <div className="space-y-3 mb-5">
              <CopyRow label="Số tiền" value={formatPrice(order.amount)}
                copyKey="momo-amount" copied={copied}
                onCopy={() => copy(order.amount.toString(), 'momo-amount')} />
            </div>

            {order.paymentUrl && (
              <a
                href={order.paymentUrl}
                className="flex items-center justify-center gap-2 w-full py-4 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-base hover:opacity-90 transition-all shadow-lg shadow-purple-500/20"
              >
                Mở ứng dụng MoMo để thanh toán →
              </a>
            )}
          </div>
        )}

        {/* ── MB Bank payment block ── */}
        {!isMomo && mb && (
          <div className="glass rounded-2xl p-6 border border-cyan-500/20 mb-5">
            <p className="text-slate-400 text-sm font-medium mb-5">Thông tin chuyển khoản</p>

            {/* VietQR */}
            {mb.qrCodeUrl && (
              <div className="flex justify-center mb-6">
                <div className="bg-white p-3 rounded-2xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={mb.qrCodeUrl} alt="QR chuyển khoản" width={200} height={200} className="block" />
                </div>
              </div>
            )}

            <div className="space-y-3">
              <CopyRow label="Ngân hàng" value={mb.bankName ?? '—'} />
              <CopyRow label="Số tài khoản" value={mb.accountNumber ?? '—'}
                copyKey="acc" copied={copied}
                onCopy={mb.accountNumber ? () => copy(mb.accountNumber!, 'acc') : undefined} />
              <CopyRow label="Chủ tài khoản" value={mb.accountName ?? '—'} />
              <CopyRow label="Số tiền" value={formatPrice(order.amount)}
                copyKey="amt" copied={copied}
                onCopy={() => copy(order.amount.toString(), 'amt')} />
              <CopyRow
                label="Nội dung chuyển khoản"
                value={mb.paymentContent ?? order.orderCode}
                copyKey="content"
                copied={copied}
                onCopy={() => copy(mb.paymentContent ?? order.orderCode, 'content')}
                highlight
              />
            </div>
          </div>
        )}

        {/* Warning / notice */}
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4 mb-5 flex gap-3">
          <Clock className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-yellow-300 font-semibold text-sm mb-1">
              {isMomo ? 'Quét mã QR hoặc bấm mở ứng dụng MoMo' : 'Nhập đúng nội dung chuyển khoản!'}
            </p>
            <p className="text-slate-400 text-xs leading-relaxed">
              {isMomo
                ? 'Đơn hàng tự động cập nhật sau khi MoMo xác nhận. Không cần bấm thêm bước nào.'
                : <>Nội dung phải chứa mã đơn{' '}
                    <span className="text-white font-mono font-bold">{order.orderCode}</span>{' '}
                    để shop xác nhận.</>
              }
            </p>
          </div>
        </div>

        {/* Status */}
        <div className="glass rounded-2xl p-5 border border-white/10 mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-yellow-400 animate-pulse" />
            <span className="text-white font-medium">Đang chờ thanh toán...</span>
          </div>
          <button onClick={fetchOrder} className="text-slate-400 hover:text-white transition-colors" title="Tải lại">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* CTA — only show for MB Bank (MoMo is auto-confirmed via IPN) */}
        {!isMomo && (
          <button
            onClick={handleConfirm}
            disabled={confirming}
            className="w-full btn-primary py-4 text-base justify-center mb-3 disabled:opacity-60"
          >
            {confirming ? <RefreshCw className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
            {confirming ? 'Đang kiểm tra...' : 'Tôi đã chuyển khoản xong'}
          </button>
        )}

        <a href={zaloHref} target="_blank" rel="noopener noreferrer"
          className={`w-full btn-secondary py-4 text-base justify-center block text-center ${isMomo ? '' : ''}`}>
          <MessageCircle className="w-5 h-5 inline mr-2" />
          Liên hệ hỗ trợ qua Zalo
        </a>
      </div>
    </div>
  )
}

function InfoRow({ label, value, highlight, mono }: {
  label: string; value: string; highlight?: boolean; mono?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-slate-400 text-sm shrink-0">{label}</span>
      <span className={`text-right text-sm font-medium ${highlight ? 'gradient-text font-bold text-base' : 'text-white'} ${mono ? 'font-mono' : ''}`}>
        {value}
      </span>
    </div>
  )
}

function CopyRow({ label, value, copyKey, copied, onCopy, highlight }: {
  label: string; value: string; copyKey?: string;
  copied?: string | null; onCopy?: () => void; highlight?: boolean
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
        {copied === copyKey && <span className="text-emerald-400 text-xs">Đã copy!</span>}
      </div>
    </div>
  )
}
