'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { productSchema, type ProductData } from '@/lib/validators'
import { CATEGORIES } from '@/lib/utils'
import { Loader2, X } from 'lucide-react'

interface ProductFormProps {
  initial?: Partial<ProductData> & { id?: string }
  onSuccess: () => void
  onCancel: () => void
}

export default function ProductForm({ initial, onSuccess, onCancel }: ProductFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProductData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: initial?.name || '',
      slug: initial?.slug || '',
      category: initial?.category as ProductData['category'] || 'AI',
      description: initial?.description || '',
      priceFrom: initial?.priceFrom || 0,
      badge: initial?.badge || '',
      icon: initial?.icon || '📦',
      isActive: initial?.isActive ?? true,
      isFeatured: initial?.isFeatured ?? false,
    },
  })

  const onSubmit = async (data: ProductData) => {
    setLoading(true)
    setError(null)

    try {
      const url = initial?.id ? `/api/admin/products/${initial.id}` : '/api/admin/products'
      const method = initial?.id ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.error || 'Lỗi khi lưu sản phẩm')
        return
      }

      onSuccess()
    } catch {
      setError('Không thể kết nối server')
    } finally {
      setLoading(false)
    }
  }

  const inputClass = 'w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-400/50 transition-all'
  const labelClass = 'block text-slate-300 text-sm font-medium mb-2'
  const errorClass = 'text-red-400 text-xs mt-1'

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Tên sản phẩm *</label>
          <input {...register('name')} placeholder="CapCut Pro" className={inputClass} />
          {errors.name && <p className={errorClass}>{errors.name.message}</p>}
        </div>
        <div>
          <label className={labelClass}>Slug *</label>
          <input {...register('slug')} placeholder="capcut-pro" className={inputClass} />
          {errors.slug && <p className={errorClass}>{errors.slug.message}</p>}
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div>
          <label className={labelClass}>Danh mục *</label>
          <select {...register('category')} className={`${inputClass} cursor-pointer`}>
            {CATEGORIES.slice(1).map((cat) => (
              <option key={cat} value={cat} className="bg-[#0f172a]">{cat}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Icon (emoji)</label>
          <input {...register('icon')} placeholder="📦" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Badge</label>
          <input {...register('badge')} placeholder="Bán chạy" className={inputClass} />
        </div>
      </div>

      <div>
        <label className={labelClass}>Mô tả *</label>
        <textarea
          {...register('description')}
          rows={3}
          placeholder="Mô tả ngắn gọn về sản phẩm..."
          className={`${inputClass} resize-none`}
        />
        {errors.description && <p className={errorClass}>{errors.description.message}</p>}
      </div>

      <div>
        <label className={labelClass}>Giá từ (VNĐ) *</label>
        <input
          {...register('priceFrom', { valueAsNumber: true })}
          type="number"
          placeholder="99000"
          className={inputClass}
        />
        {errors.priceFrom && <p className={errorClass}>{errors.priceFrom.message}</p>}
      </div>

      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" {...register('isActive')} className="w-4 h-4 rounded accent-cyan-500" />
          <span className="text-slate-300 text-sm">Hiển thị trên website</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" {...register('isFeatured')} className="w-4 h-4 rounded accent-cyan-500" />
          <span className="text-slate-300 text-sm">Sản phẩm nổi bật</span>
        </label>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-white font-semibold text-sm disabled:opacity-60 transition-all"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {initial?.id ? 'Cập nhật sản phẩm' : 'Thêm sản phẩm'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-3 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 transition-all"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </form>
  )
}
