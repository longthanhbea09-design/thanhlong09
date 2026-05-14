'use client'

import { useState, useEffect } from 'react'
import { X, ChevronLeft, Loader2, CheckCircle, Copy, Check } from 'lucide-react'
import { getProductVariants, type ProductVariant } from '@/lib/defaultVariants'
import { formatPrice } from '@/lib/utils'
import { getVietQRUrl } from '@/lib/vietqr'
import ProductLogo from './ProductLogo'
import type { Product, ProductPlan, Setting } from '@/types'

type Step = 1 | 2 | 3

interface Props {
  product: Product
  settings: Setting | null
  onClose: () => void
}

interface OrderData {
  orderCode: string
  qrCode: string
  paymentUrl: string
  amount: number
  variantName: string
}

interface CustomerInfo {
  customerName: string
  phone: string
  email: string
  note: string
}

const STEPS = ['Chọn gói', 'Thông tin', 'Thanh toán']

export default function ProductCheckoutModal({ product, settings, onClose }: Props) {
  const [step, setStep] = useState<Step>(1)
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null)
  const [customer, setCustomer] = useState<CustomerInfo>({ customerName: '', phone: '', email: '', note: '' })
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [orderData, setOrderData] = useState<OrderData | null>(null)
  const [paymentStatus, setPaymentStatus] = useState<string>('pending')
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [freshPlans, setFreshPlans] = useState<ProductPlan[] | null>(null)

  // Fetch fresh plans from DB when modal opens so prices are always up-to-date
  useEffect(() => {
    fetch(`/api/products/${product.id}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data?.plans)) setFreshPlans(data.plans) })
      .catch(() => {})
  }, [product.id])

  const variants = getProductVariants(
    freshPlans ? { ...product, plans: freshPlans } : product
  )

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    if (step !== 3 || !orderData || paymentStatus === 'paid') return

    const poll = async () => {
      try {
        const res = await fetch(`/api/orders/${orderData.orderCode}`)
        const json = await res.json()
        if (json.paymentStatus === 'paid') setPaymentStatus('paid')
      } catch { /* ignore network errors */ }
    }

    poll()
    const interval = setInterval(poll, 3000)
    return () => clearInterval(interval)
  }, [step, orderData, paymentStatus])

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const validateStep2 = () => {
    const errs: Record<string, string> = {}
    if (customer.customerName.trim().length < 2)
      errs.customerName = 'Vui lòng nhập họ tên (ít nhất 2 ký tự)'
    if (!/^[0-9]{9,11}$/.test(customer.phone.trim()))
      errs.phone = 'Số điện thoại không hợp lệ (9–11 chữ số)'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email.trim()))
      errs.email = 'Email không hợp lệ'
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  const submitOrder = async () => {
    if (!selectedVariant?.planId) return
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const res = await fetch('/api/checkout/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: customer.customerName.trim(),
          phone: customer.phone.trim(),
          email: customer.email.trim(),
          note: customer.note.trim() || undefined,
          planId: selectedVariant.planId,
        }),
      })

      const json = await res.json()
      if (!res.ok) {
        setSubmitError(json.error || 'Có lỗi xảy ra, vui lòng thử lại')
        return
      }

      setOrderData({
        orderCode: json.orderCode,
        qrCode: json.qrCode || '',
        paymentUrl: json.paymentUrl || '',
        amount: json.amount ?? selectedVariant.price,
        variantName: selectedVariant.name,
      })
      setStep(3)
    } catch {
      setSubmitError('Không thể kết nối. Vui lòng kiểm tra mạng và thử lại.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal box */}
      <div className="relative w-full sm:max-w-md max-h-[92vh] sm:max-h-[85vh] overflow-y-auto glass border border-white/10 rounded-t-3xl sm:rounded-3xl shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#050816]/95 backdrop-blur-md border-b border-white/10 px-5 py-4">
          {/* Progress steps */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {STEPS.map((s, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      step > i + 1
                        ? 'bg-emerald-500 text-white'
                        : step === i + 1
                        ? 'bg-gradient-to-r from-cyan-500 to-emerald-500 text-white'
                        : 'bg-white/10 text-slate-500'
                    }`}
                  >
                    {step > i + 1 ? '✓' : i + 1}
                  </div>
                  <span
                    className={`text-xs hidden sm:inline ${
                      step === i + 1 ? 'text-white font-medium' : 'text-slate-500'
                    }`}
                  >
                    {s}
                  </span>
                  {i < STEPS.length - 1 && (
                    <div
                      className={`h-0.5 w-5 sm:w-8 rounded ${
                        step > i + 1 ? 'bg-emerald-500' : 'bg-white/10'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Product name row */}
          <div className="flex items-center gap-2 mt-3">
            <ProductLogo slug={product.slug} size={24} />
            <span className="text-white font-semibold text-sm">{product.name}</span>
            <span className="text-slate-500 text-xs">· {STEPS[step - 1]}</span>
          </div>
        </div>

        {/* ── Step 1: Variant selection ── */}
        {step === 1 && (
          <div className="p-5">
            <h3 className="text-white font-bold text-lg mb-1">Chọn gói dịch vụ</h3>
            <p className="text-slate-400 text-sm mb-5">
              Tất cả gói đều bao gồm hỗ trợ cài đặt và hướng dẫn sử dụng
            </p>

            <div className="flex flex-col gap-2.5">
              {variants.map((v) => {
                const isSelected = selectedVariant?.id === v.id
                return (
                  <button
                    key={v.id}
                    onClick={() => !v.disabled && setSelectedVariant(v)}
                    disabled={v.disabled}
                    className={`relative text-left p-4 rounded-xl border transition-all duration-200 ${
                      v.disabled
                        ? 'border-white/5 bg-white/[0.02] opacity-50 cursor-not-allowed'
                        : isSelected
                        ? 'border-cyan-400 bg-cyan-500/10 shadow-lg shadow-cyan-500/20'
                        : 'border-white/10 bg-white/5 hover:border-white/30 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      {/* Left: name + meta */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-white font-semibold text-sm leading-snug">{v.name}</p>
                          {v.badge && (
                            <span
                              className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                                v.disabled
                                  ? 'bg-white/10 text-slate-400 border border-white/10'
                                  : 'bg-gradient-to-r from-cyan-500 to-emerald-500 text-white'
                              }`}
                            >
                              {v.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-slate-500 text-xs mt-0.5">{v.warrantyText}</p>
                        {v.subLabel && (
                          <p className="text-slate-500 text-xs mt-0.5">{v.subLabel}</p>
                        )}
                      </div>

                      {/* Right: price + status */}
                      <div className="shrink-0 text-right">
                        <p
                          className={`font-bold text-base ${
                            isSelected ? 'gradient-text' : 'text-slate-200'
                          }`}
                        >
                          {formatPrice(v.price)}
                        </p>
                        <span
                          className={`text-[10px] font-medium ${
                            v.disabled ? 'text-orange-400' : 'text-emerald-400'
                          }`}
                        >
                          {v.disabled ? '● Hết hàng' : '● Còn hàng'}
                        </span>
                      </div>
                    </div>

                    {/* Selected indicator */}
                    {isSelected && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-cyan-500 to-emerald-500 rounded-l-xl" />
                    )}
                  </button>
                )
              })}
            </div>

            <button
              onClick={() => selectedVariant && setStep(2)}
              disabled={!selectedVariant}
              className="w-full mt-6 py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-white font-semibold transition-all duration-200 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
            >
              Tiếp theo →
            </button>
          </div>
        )}

        {/* ── Step 2: Customer info ── */}
        {step === 2 && (
          <div className="p-5">
            <h3 className="text-white font-bold text-lg mb-1">Thông tin của bạn</h3>
            <p className="text-slate-400 text-sm mb-5">
              Đặt hàng:{' '}
              <span className="text-cyan-400 font-semibold">{selectedVariant?.name}</span>
              {' — '}
              <span className="gradient-text font-bold">
                {selectedVariant?.price ? formatPrice(selectedVariant.price) : ''}
              </span>
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-white font-medium mb-1.5 text-sm">
                  Họ và tên <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={customer.customerName}
                  onChange={(e) => setCustomer((c) => ({ ...c, customerName: e.target.value }))}
                  placeholder="Nhập họ tên đầy đủ"
                  className="input-field"
                />
                {fieldErrors.customerName && (
                  <p className="text-red-400 text-xs mt-1">{fieldErrors.customerName}</p>
                )}
              </div>

              <div>
                <label className="block text-white font-medium mb-1.5 text-sm">
                  Số điện thoại / Zalo <span className="text-red-400">*</span>
                </label>
                <input
                  type="tel"
                  value={customer.phone}
                  onChange={(e) => setCustomer((c) => ({ ...c, phone: e.target.value }))}
                  placeholder="Ví dụ: 0912345678"
                  className="input-field"
                />
                {fieldErrors.phone && (
                  <p className="text-red-400 text-xs mt-1">{fieldErrors.phone}</p>
                )}
              </div>

              <div>
                <label className="block text-white font-medium mb-1.5 text-sm">
                  Email nhận tài khoản <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  value={customer.email}
                  onChange={(e) => setCustomer((c) => ({ ...c, email: e.target.value }))}
                  placeholder="Nhập Gmail hoặc email nhận tài khoản"
                  className="input-field"
                  inputMode="email"
                  autoComplete="email"
                />
                {fieldErrors.email && (
                  <p className="text-red-400 text-xs mt-1">{fieldErrors.email}</p>
                )}
                <p className="text-slate-500 text-xs mt-1">
                  Thông tin tài khoản sẽ được gửi về email này sau khi shop xử lý.
                </p>
              </div>

              <div>
                <label className="block text-white font-medium mb-1.5 text-sm">
                  Ghi chú{' '}
                  <span className="text-slate-500 font-normal">(không bắt buộc)</span>
                </label>
                <textarea
                  value={customer.note}
                  onChange={(e) => setCustomer((c) => ({ ...c, note: e.target.value }))}
                  rows={2}
                  placeholder="Ghi chú thêm nếu có..."
                  className="input-field resize-none"
                />
              </div>
            </div>

            {submitError && (
              <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">
                {submitError}
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setSubmitError(null); setStep(1) }}
                className="px-4 py-3 rounded-xl border border-white/20 text-slate-300 hover:text-white hover:border-white/40 transition-all text-sm flex items-center gap-1 shrink-0"
              >
                <ChevronLeft className="w-4 h-4" />
                Quay lại
              </button>
              <button
                onClick={() => { if (validateStep2()) submitOrder() }}
                disabled={isSubmitting}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-white font-semibold transition-all duration-200 active:scale-95 disabled:opacity-60 disabled:active:scale-100 flex items-center justify-center gap-2 text-sm"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Đang xử lý...
                  </>
                ) : (
                  'Xác nhận & Thanh toán →'
                )}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Payment ── */}
        {step === 3 && orderData && (
          <div className="p-5">
            {paymentStatus === 'paid' ? (
              <div className="text-center py-10">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <CheckCircle className="w-10 h-10 text-emerald-400" />
                </div>
                <h3 className="text-white font-bold text-xl mb-2">Thanh toán thành công!</h3>
                <p className="text-slate-400 text-sm mb-1">
                  Mã đơn hàng:{' '}
                  <span className="text-cyan-400 font-mono font-semibold">{orderData.orderCode}</span>
                </p>
                <p className="text-slate-400 text-sm mb-7">
                  Chúng tôi sẽ liên hệ bạn trong vòng{' '}
                  <span className="text-cyan-400 font-semibold">5 phút</span> qua Zalo/điện thoại.
                </p>
                <button
                  onClick={onClose}
                  className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-white font-semibold active:scale-95 transition-transform"
                >
                  Đóng
                </button>
              </div>
            ) : (
              <>
                <div className="text-center mb-5">
                  <h3 className="text-white font-bold text-lg mb-1">Quét mã để thanh toán</h3>
                  <p className="text-slate-400 text-sm">
                    {orderData.variantName} —{' '}
                    <span className="gradient-text font-bold">{formatPrice(orderData.amount)}</span>
                  </p>
                </div>

                {/* QR Code — sinh động per-order từ VietQR (bankBin + amount + orderCode) */}
                {(() => {
                  const vietqrUrl =
                    settings?.bankBin && settings?.bankAccount
                      ? getVietQRUrl({
                          bankBin: settings.bankBin,
                          bankAccount: settings.bankAccount,
                          amount: orderData.amount,
                          addInfo: orderData.orderCode,
                          accountName: settings.bankOwner || '',
                        })
                      : null
                  const qrSrc = vietqrUrl || settings?.qrCodeUrl || orderData.qrCode || null
                  return (
                    <div className="flex justify-center mb-5">
                      <div className="bg-white p-3 rounded-2xl shadow-lg">
                        {qrSrc ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={qrSrc}
                            alt="QR thanh toán"
                            width={200}
                            height={200}
                            className="rounded-xl block"
                          />
                        ) : (
                          <div className="w-[200px] h-[200px] flex items-center justify-center text-slate-400 text-sm">
                            <Loader2 className="w-6 h-6 animate-spin" />
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })()}

                {/* Bank info table — lấy từ settings DB, không hardcode */}
                <div className="bg-white/5 border border-white/10 rounded-xl divide-y divide-white/5 mb-5">
                  <div className="flex justify-between items-center px-4 py-3">
                    <span className="text-slate-400 text-sm">Ngân hàng</span>
                    <span className="text-white font-medium text-sm">
                      {settings?.bankName || '—'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center px-4 py-3">
                    <span className="text-slate-400 text-sm">Số tài khoản</span>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-mono font-semibold">
                        {settings?.bankAccount || '—'}
                      </span>
                      {settings?.bankAccount && (
                        <button
                          onClick={() => handleCopy(settings.bankAccount, 'account')}
                          className="text-slate-400 hover:text-white transition-colors"
                        >
                          {copiedField === 'account' ? (
                            <Check className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between items-center px-4 py-3">
                    <span className="text-slate-400 text-sm">Chủ tài khoản</span>
                    <span className="text-white font-medium text-sm">
                      {settings?.bankOwner || '—'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center px-4 py-3">
                    <span className="text-slate-400 text-sm">Số tiền</span>
                    <span className="gradient-text font-bold">{formatPrice(orderData.amount)}</span>
                  </div>
                  <div className="flex justify-between items-center px-4 py-3">
                    <span className="text-slate-400 text-sm shrink-0">Nội dung CK</span>
                    <div className="flex items-center gap-2">
                      <span className="text-cyan-400 font-mono text-sm">{orderData.orderCode}</span>
                      <button
                        onClick={() => handleCopy(orderData.orderCode, 'orderCode')}
                        className="text-slate-400 hover:text-white transition-colors"
                      >
                        {copiedField === 'orderCode' ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Polling indicator */}
                <div className="flex items-center justify-center gap-2 text-slate-500 text-sm py-2">
                  <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                  <span>Đang chờ xác nhận thanh toán...</span>
                </div>
                <p className="text-center text-slate-600 text-xs mt-1">
                  Tự động cập nhật mỗi 3 giây
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
