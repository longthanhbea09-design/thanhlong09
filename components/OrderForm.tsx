'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Send, Loader2, ChevronDown } from 'lucide-react'
import { orderSchema, type OrderFormData } from '@/lib/validators'
import { formatPrice } from '@/lib/utils'
import type { Product, ProductPlan } from '@/types'

interface OrderFormProps {
  products: Product[]
  selectedProduct: Product | null
}

const CONTACT_METHODS = [
  { value: 'zalo', label: 'Zalo (nhanh nhất)' },
  { value: 'phone', label: 'Gọi điện' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'telegram', label: 'Telegram' },
]

export default function OrderForm({ products, selectedProduct }: OrderFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [plans, setPlans] = useState<ProductPlan[]>([])

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      contactMethod: 'zalo',
      productId: '',
      planId: '',
    },
  })

  const watchProductId = watch('productId')

  useEffect(() => {
    if (selectedProduct) {
      setValue('productId', selectedProduct.id)
    }
  }, [selectedProduct, setValue])

  useEffect(() => {
    const product = products.find((p) => p.id === watchProductId)
    if (product) {
      setPlans(product.plans.filter((pl) => pl.isActive))
      setValue('planId', '')
    } else {
      setPlans([])
    }
  }, [watchProductId, products, setValue])

  const selectedPlan = plans.find((p) => p.id === watch('planId'))
  const selectedProd = products.find((p) => p.id === watchProductId)

  const onSubmit = async (data: OrderFormData) => {
    setIsSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/checkout/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.error || 'Có lỗi xảy ra, vui lòng thử lại')
        return
      }

      router.push(`/checkout/${json.orderCode}`)
    } catch {
      setError('Không thể kết nối. Vui lòng kiểm tra mạng và thử lại.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section id="order-form" className="py-20 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-950/10 to-transparent" />
      <div className="relative max-w-2xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-10">
          <h2 className="section-title">Đặt hàng ngay</h2>
          <p className="section-subtitle">
            Không cần tạo tài khoản — chỉ nhập số điện thoại là xong
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="glass rounded-3xl p-8 border border-white/10 space-y-6">
          {/* Honeypot */}
          <input type="text" {...register('honeypot')} className="hidden" tabIndex={-1} autoComplete="off" />

          {/* Name */}
          <div>
            <label className="block text-white font-semibold mb-2 text-base">
              Họ và tên <span className="text-red-400">*</span>
            </label>
            <input
              {...register('customerName')}
              placeholder="Nhập họ tên đầy đủ"
              className="input-field"
            />
            {errors.customerName && (
              <p className="text-red-400 text-sm mt-1">{errors.customerName.message}</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-white font-semibold mb-2 text-base">
              Số điện thoại / Zalo <span className="text-red-400">*</span>
            </label>
            <input
              {...register('phone')}
              type="tel"
              placeholder="Ví dụ: 0912345678"
              className="input-field"
            />
            {errors.phone && (
              <p className="text-red-400 text-sm mt-1">{errors.phone.message}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-white font-semibold mb-2 text-base">
              Email <span className="text-slate-500 font-normal">(không bắt buộc)</span>
            </label>
            <input
              {...register('email')}
              type="email"
              placeholder="example@gmail.com"
              className="input-field"
            />
            {errors.email && (
              <p className="text-red-400 text-sm mt-1">{errors.email.message}</p>
            )}
          </div>

          {/* Product */}
          <div>
            <label className="block text-white font-semibold mb-2 text-base">
              Sản phẩm muốn mua <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <select {...register('productId')} className="input-field appearance-none pr-10 cursor-pointer">
                <option value="">-- Chọn sản phẩm --</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id} className="bg-[#0f172a]">
                    {p.icon} {p.name} ({p.category})
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
            </div>
            {errors.productId && (
              <p className="text-red-400 text-sm mt-1">{errors.productId.message}</p>
            )}
          </div>

          {/* Plan */}
          <div>
            <label className="block text-white font-semibold mb-2 text-base">
              Gói thời hạn <span className="text-red-400">*</span>
            </label>
            {plans.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {plans.map((plan) => {
                  const isSelected = watch('planId') === plan.id
                  return (
                    <label
                      key={plan.id}
                      className={`cursor-pointer rounded-xl p-4 border text-center transition-all duration-200 ${
                        isSelected
                          ? 'border-cyan-400 bg-cyan-500/10 shadow-lg shadow-cyan-500/20'
                          : 'border-white/10 bg-white/5 hover:border-white/30'
                      }`}
                    >
                      <input
                        type="radio"
                        value={plan.id}
                        {...register('planId')}
                        className="sr-only"
                      />
                      <p className="text-white font-semibold text-sm">{plan.name}</p>
                      <p className={`font-bold mt-1 ${isSelected ? 'gradient-text' : 'text-slate-300'}`}>
                        {formatPrice(plan.price)}
                      </p>
                      {plan.description && (
                        <p className="text-slate-500 text-xs mt-1">{plan.description}</p>
                      )}
                    </label>
                  )
                })}
              </div>
            ) : (
              <div className="input-field text-slate-500 flex items-center">
                {watchProductId ? 'Sản phẩm này chưa có gói' : 'Vui lòng chọn sản phẩm trước'}
              </div>
            )}
            {errors.planId && (
              <p className="text-red-400 text-sm mt-1">{errors.planId.message}</p>
            )}
          </div>

          {/* Contact method */}
          <div>
            <label className="block text-white font-semibold mb-2 text-base">
              Liên hệ qua kênh nào?
            </label>
            <div className="grid grid-cols-2 gap-2">
              {CONTACT_METHODS.map((m) => {
                const isSelected = watch('contactMethod') === m.value
                return (
                  <label
                    key={m.value}
                    className={`cursor-pointer flex items-center gap-2 px-4 py-3 rounded-xl border transition-all ${
                      isSelected
                        ? 'border-cyan-400 bg-cyan-500/10 text-white'
                        : 'border-white/10 bg-white/5 text-slate-400 hover:border-white/30'
                    }`}
                  >
                    <input
                      type="radio"
                      value={m.value}
                      {...register('contactMethod')}
                      className="sr-only"
                    />
                    <span className="text-sm font-medium">{m.label}</span>
                  </label>
                )
              })}
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-white font-semibold mb-2 text-base">
              Ghi chú <span className="text-slate-500 font-normal">(không bắt buộc)</span>
            </label>
            <textarea
              {...register('note')}
              rows={3}
              placeholder="Ghi chú thêm nếu có (ví dụ: gói cụ thể, thời gian rảnh liên hệ...)"
              className="input-field resize-none"
            />
          </div>

          {/* Order summary */}
          {selectedProd && selectedPlan && (
            <div className="bg-gradient-to-r from-cyan-500/10 to-emerald-500/10 border border-cyan-500/20 rounded-2xl p-5">
              <p className="text-slate-400 text-sm mb-3 font-medium">Tóm tắt đơn hàng</p>
              <div className="flex items-center justify-between mb-2">
                <span className="text-white">
                  {selectedProd.icon} {selectedProd.name} — {selectedPlan.name}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Tổng thanh toán</span>
                <span className="gradient-text text-2xl font-extrabold">
                  {formatPrice(selectedPlan.price)}
                </span>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full btn-primary py-5 text-lg justify-center disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Đang gửi đơn...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Gửi đơn hàng
              </>
            )}
          </button>

          <p className="text-center text-slate-500 text-sm">
            Sau khi gửi, chúng tôi sẽ liên hệ bạn trong vòng{' '}
            <span className="text-cyan-400 font-semibold">5 phút</span>
          </p>
        </form>
      </div>
    </section>
  )
}
