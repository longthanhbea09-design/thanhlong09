'use client'

import { useState, useEffect } from 'react'
import { X, ChevronLeft, Loader2, CheckCircle, Copy, Check } from 'lucide-react'
import { getProductVariants, type ProductVariant } from '@/lib/defaultVariants'
import { formatPrice } from '@/lib/utils'
import ProductLogo from './ProductLogo'
import type { Product, ProductPlan, Setting } from '@/types'

type Step = 1 | 2 | 3

interface Props {
  product: Product
  settings: Setting | null
  onClose: () => void
}

interface MbBankInfo {
  bankName: string | null
  accountNumber: string | null
  accountName: string | null
  paymentContent: string | null
  qrCodeUrl: string | null
}

interface OrderData {
  orderCode: string
  accessToken: string
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

const footerSafeArea: React.CSSProperties = {
  paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)',
}

export default function ProductCheckoutModal({ product, settings, onClose }: Props) {
  const [step, setStep] = useState<Step>(1)
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null)
  const [customer, setCustomer] = useState<CustomerInfo>({ customerName: '', phone: '', email: '', note: '' })
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [orderData, setOrderData] = useState<OrderData | null>(null)
  const [mbBankInfo, setMbBankInfo] = useState<MbBankInfo | null>(null)
  const [paymentStatus, setPaymentStatus] = useState<string>('pending')
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [freshPlans, setFreshPlans] = useState<ProductPlan[] | null>(null)

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
        const res = await fetch(`/api/orders/${orderData.orderCode}`, { cache: 'no-store' })
        const json = await res.json()
        if (json.paymentStatus === 'paid') setPaymentStatus('paid')
        if (json.mbBankInfo) setMbBankInfo(json.mbBankInfo)
      } catch { /* ignore */ }
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
        accessToken: json.accessToken || '',
        amount: json.amount ?? selectedVariant.price,
        variantName: selectedVariant.name,
      })
      setStep(3)

      fetch(`/api/orders/${json.orderCode}`, { cache: 'no-store' })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?.mbBankInfo) setMbBankInfo(data.mbBankInfo)
          else if (json.qrCode) setMbBankInfo({ bankName: null, accountNumber: null, accountName: null, paymentContent: null, qrCodeUrl: json.qrCode })
        })
        .catch(() => {
          if (json.qrCode) setMbBankInfo({ bankName: null, accountNumber: null, accountName: null, paymentContent: null, qrCodeUrl: json.qrCode })
        })
    } catch {
      setSubmitError('Không thể kết nối. Vui lòng kiểm tra mạng và thử lại.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const isPaid = paymentStatus === 'paid'

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/55 backdrop-blur-sm"
        style={{ WebkitBackdropFilter: 'blur(8px)' } as React.CSSProperties}
        onClick={onClose}
      />

      {/* Sheet / Modal
          Mobile  : absolute top-4 → bottom-0  (nearly full screen, 16px gap at top)
          Desktop : centered modal via translate
      */}
      <div className="absolute flex flex-col overflow-hidden glass border border-white/10 shadow-2xl
        inset-x-0 top-2 bottom-0 rounded-t-[24px]
        md:inset-auto md:left-1/2 md:top-1/2 md:bottom-auto
        md:-translate-x-1/2 md:-translate-y-1/2
        md:w-full md:max-w-md md:max-h-[85dvh] md:rounded-3xl">

        {/* ── Sticky Header ── */}
        <div className="flex-none bg-[#050816]/95 backdrop-blur-md border-b border-slate-800 px-5 py-3">
          {/* Step indicator — centered, X absolute right */}
          <div className="relative flex items-center justify-center mb-2">
            <div className="flex items-center gap-1.5">
              {STEPS.map((s, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
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
                    className={`text-[11px] hidden sm:inline ${
                      step === i + 1 ? 'text-white font-medium' : 'text-slate-500'
                    }`}
                  >
                    {s}
                  </span>
                  {i < STEPS.length - 1 && (
                    <div className={`h-0.5 w-5 rounded ${step > i + 1 ? 'bg-emerald-500' : 'bg-white/10'}`} />
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={onClose}
              aria-label="Đóng"
              className="absolute right-0 w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Product row */}
          <div className="flex items-center gap-2 min-w-0">
            <ProductLogo slug={product.slug} size={18} />
            <span className="text-white font-semibold text-sm truncate min-w-0">{product.name}</span>
            <span className="text-slate-500 text-xs shrink-0">· {STEPS[step - 1]}</span>
          </div>
        </div>

        {/* ── Scrollable Content ── */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">

          {/* Step 1: Variant selection */}
          {step === 1 && (
            <div className="px-5 pt-5 pb-4">
              <h3 className="text-white font-bold text-xl mb-1">Chọn gói dịch vụ</h3>
              <p className="text-slate-400 text-sm mb-4">
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
                      className={`relative w-full text-left p-4 rounded-xl border transition-all duration-200 ${
                        v.disabled
                          ? 'border-white/5 bg-white/[0.02] opacity-40 cursor-not-allowed'
                          : isSelected
                          ? 'border-cyan-400 bg-cyan-500/10 shadow-lg shadow-cyan-500/20'
                          : 'border-white/10 bg-white/5 hover:border-white/30 active:scale-[0.99] cursor-pointer'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
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
                          {v.subLabel && <p className="text-slate-500 text-xs mt-0.5">{v.subLabel}</p>}
                        </div>
                        <div className="shrink-0 text-right">
                          <p className={`font-bold text-base ${isSelected ? 'gradient-text' : 'text-slate-200'}`}>
                            {formatPrice(v.price)}
                          </p>
                          <span className={`text-[10px] font-medium ${
                            v.saleStatus === 'OUT_OF_STOCK' ? 'text-orange-400'
                            : v.saleStatus === 'MAINTENANCE' ? 'text-amber-400'
                            : v.saleStatus === 'PREORDER' ? 'text-indigo-400'
                            : 'text-emerald-400'
                          }`}>
                            {v.saleStatus === 'OUT_OF_STOCK' ? '● Hết hàng'
                              : v.saleStatus === 'MAINTENANCE' ? '● Tạm đóng'
                              : v.saleStatus === 'PREORDER' ? '● Đặt trước'
                              : '● Còn hàng'}
                          </span>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-cyan-500 to-emerald-500 rounded-l-xl" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Step 2: Customer info */}
          {step === 2 && (
            <div className="px-5 pt-5 pb-4">
              <h3 className="text-white font-bold text-xl mb-1">Thông tin của bạn</h3>
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
                    Tài khoản giao qua email này ngay sau khi thanh toán.
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
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && orderData && (
            isPaid ? (
              /* Success state */
              <div className="flex flex-col items-center justify-center px-5 py-10 text-center">
                <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mb-5">
                  <CheckCircle className="w-10 h-10 text-emerald-400" />
                </div>
                <h3 className="text-white font-bold text-2xl mb-2">Thanh toán thành công!</h3>
                <p className="text-slate-400 text-sm mb-1">
                  Mã đơn:{' '}
                  <span className="text-cyan-400 font-mono font-semibold">{orderData.orderCode}</span>
                </p>
                <p className="text-slate-400 text-sm">
                  Hệ thống đang giao tài khoản tự động.
                </p>
              </div>
            ) : (
              /* Waiting for payment */
              <div className="px-5 pt-4 pb-3">
                <div className="text-center mb-3">
                  <h3 className="text-white font-bold text-base mb-0.5">Quét mã để thanh toán</h3>
                  <p className="text-slate-400 text-sm">
                    {orderData.variantName} —{' '}
                    <span className="gradient-text font-bold">{formatPrice(orderData.amount)}</span>
                  </p>
                </div>

                <div className="flex justify-center mb-3">
                  <div className="bg-white p-2.5 rounded-2xl shadow-lg">
                    {mbBankInfo?.qrCodeUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={mbBankInfo.qrCodeUrl}
                        alt="QR thanh toán"
                        width={160}
                        height={160}
                        className="rounded-xl block w-[150px] h-auto"
                      />
                    ) : (
                      <div className="w-[150px] h-[150px] flex items-center justify-center">
                        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-xl divide-y divide-white/5 mb-3">
                  <div className="flex justify-between items-center px-3.5 py-2.5">
                    <span className="text-slate-400 text-sm">Ngân hàng</span>
                    <span className="text-white font-medium text-sm">
                      {mbBankInfo?.bankName ?? <span className="inline-block w-20 h-4 bg-white/10 rounded animate-pulse" />}
                    </span>
                  </div>
                  <div className="flex justify-between items-center px-3.5 py-2.5">
                    <span className="text-slate-400 text-sm">Số tài khoản</span>
                    <div className="flex items-center gap-2">
                      {mbBankInfo?.accountNumber ? (
                        <>
                          <span className="text-white font-mono font-semibold">{mbBankInfo.accountNumber}</span>
                          <button
                            onClick={() => handleCopy(mbBankInfo.accountNumber!, 'account')}
                            className="text-slate-400 hover:text-white transition-colors"
                          >
                            {copiedField === 'account' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </>
                      ) : (
                        <span className="inline-block w-28 h-4 bg-white/10 rounded animate-pulse" />
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between items-center px-3.5 py-2.5">
                    <span className="text-slate-400 text-sm">Chủ tài khoản</span>
                    <span className="text-white font-medium text-sm">
                      {mbBankInfo?.accountName ?? <span className="inline-block w-32 h-4 bg-white/10 rounded animate-pulse" />}
                    </span>
                  </div>
                  <div className="flex justify-between items-center px-3.5 py-2.5">
                    <span className="text-slate-400 text-sm">Số tiền</span>
                    <span className="gradient-text font-bold">{formatPrice(orderData.amount)}</span>
                  </div>
                  <div className="flex justify-between items-center px-3.5 py-2.5">
                    <span className="text-slate-400 text-sm shrink-0">Nội dung CK</span>
                    <div className="flex items-center gap-2">
                      <span className="text-cyan-400 font-mono text-sm">
                        {mbBankInfo?.paymentContent || orderData.orderCode}
                      </span>
                      <button
                        onClick={() => handleCopy(mbBankInfo?.paymentContent || orderData.orderCode, 'orderCode')}
                        className="text-slate-400 hover:text-white transition-colors"
                      >
                        {copiedField === 'orderCode' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2 text-slate-500 text-xs py-1">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                  <span>Đang chờ xác nhận — tự động cập nhật mỗi 3 giây</span>
                </div>
              </div>
            )
          )}
        </div>

        {/* ── Sticky Footer ── */}

        {/* Step 1 */}
        {step === 1 && (
          <div
            className="flex-none border-t border-slate-800 bg-[#050816]/95 backdrop-blur-md px-5 pt-3"
            style={footerSafeArea}
          >
            <button
              onClick={() => selectedVariant && setStep(2)}
              disabled={!selectedVariant}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-white font-semibold text-sm transition-all duration-200 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
            >
              Tiếp theo →
            </button>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div
            className="flex-none border-t border-slate-800 bg-[#050816]/95 backdrop-blur-md px-5 pt-3 flex gap-2.5"
            style={footerSafeArea}
          >
            <button
              onClick={() => { setSubmitError(null); setStep(1) }}
              className="h-12 px-3.5 rounded-xl border border-white/20 text-slate-300 hover:text-white hover:border-white/40 transition-all flex items-center gap-1 shrink-0 text-sm"
            >
              <ChevronLeft className="w-4 h-4" />
              Quay lại
            </button>
            <button
              onClick={() => { if (validateStep2()) submitOrder() }}
              disabled={isSubmitting}
              className="flex-1 h-12 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-white font-semibold transition-all duration-200 active:scale-[0.98] disabled:opacity-60 disabled:active:scale-100 flex items-center justify-center gap-2 text-sm"
            >
              {isSubmitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Đang xử lý...</>
              ) : (
                'Xác nhận & Thanh toán →'
              )}
            </button>
          </div>
        )}

        {/* Step 3 — paid */}
        {step === 3 && isPaid && orderData && (
          <div
            className="flex-none border-t border-slate-800 bg-[#050816]/95 backdrop-blur-md px-5 pt-3 space-y-2.5"
            style={footerSafeArea}
          >
            <a
              href={`/order-success/${orderData.orderCode}?token=${orderData.accessToken}`}
              className="w-full h-12 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-white font-semibold text-sm active:scale-[0.98] transition-transform"
            >
              Xem thông tin tài khoản →
            </a>
            <button
              onClick={onClose}
              className="w-full py-1 text-slate-400 hover:text-white text-sm transition-colors text-center"
            >
              Đóng
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
