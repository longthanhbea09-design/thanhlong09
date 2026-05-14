'use client'

import { useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { productSchema, type ProductData } from '@/lib/validators'
import { CATEGORIES } from '@/lib/utils'
import { Loader2, X, Upload, Image as ImageIcon } from 'lucide-react'

interface ProductFormProps {
  initial?: Partial<ProductData> & { id?: string }
  onSuccess: () => void
  onCancel: () => void
}

export default function ProductForm({ initial, onSuccess, onCancel }: ProductFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProductData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: initial?.name || '',
      slug: initial?.slug || '',
      category: (initial?.category as ProductData['category']) || 'AI',
      description: initial?.description || '',
      priceFrom: initial?.priceFrom || 0,
      badge: initial?.badge || '',
      icon: initial?.icon || '📦',
      imageUrl: initial?.imageUrl || '',
      isActive: initial?.isActive ?? true,
      isFeatured: initial?.isFeatured ?? false,
      sortOrder: initial?.sortOrder ?? 0,
    },
  })

  const imageUrl = watch('imageUrl')

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })
      const json = await res.json()
      if (res.ok) {
        setValue('imageUrl', json.url, { shouldValidate: true })
      } else {
        setError(json.error || 'Lỗi upload ảnh')
      }
    } catch {
      setError('Không thể upload ảnh')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const onSubmit = async (data: ProductData) => {
    setLoading(true)
    setError(null)
    try {
      const url = initial?.id ? `/api/admin/products/${initial.id}` : '/api/admin/products'
      const method = initial?.id ? 'PATCH' : 'POST'
      const payload = { ...data, imageUrl: data.imageUrl || null }
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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

  const inp = 'w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-400/50 transition-all'
  const lbl = 'block text-slate-300 text-sm font-medium mb-2'
  const err = 'text-red-400 text-xs mt-1'

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className={lbl}>Tên sản phẩm *</label>
          <input {...register('name')} placeholder="ChatGPT Plus" className={inp} />
          {errors.name && <p className={err}>{errors.name.message}</p>}
        </div>
        <div>
          <label className={lbl}>Slug *</label>
          <input {...register('slug')} placeholder="chatgpt-plus" className={inp} />
          {errors.slug && <p className={err}>{errors.slug.message}</p>}
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div>
          <label className={lbl}>Danh mục *</label>
          <select {...register('category')} className={`${inp} cursor-pointer`}>
            {CATEGORIES.slice(1).map((cat) => (
              <option key={cat} value={cat} className="bg-[#0f172a]">{cat}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={lbl}>Icon (emoji)</label>
          <input {...register('icon')} placeholder="📦" className={inp} />
        </div>
        <div>
          <label className={lbl}>Badge</label>
          <input {...register('badge')} placeholder="Bán chạy" className={inp} />
        </div>
      </div>

      <div>
        <label className={lbl}>Mô tả *</label>
        <textarea
          {...register('description')}
          rows={3}
          placeholder="Mô tả ngắn gọn về sản phẩm..."
          className={`${inp} resize-none`}
        />
        {errors.description && <p className={err}>{errors.description.message}</p>}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className={lbl}>Giá hiển thị "Từ" (VNĐ) *</label>
          <input
            {...register('priceFrom', { valueAsNumber: true })}
            type="number"
            placeholder="99000"
            className={inp}
          />
          {errors.priceFrom && <p className={err}>{errors.priceFrom.message}</p>}
        </div>
        <div>
          <label className={lbl}>Thứ tự hiển thị</label>
          <input
            {...register('sortOrder', { valueAsNumber: true })}
            type="number"
            placeholder="0"
            className={inp}
          />
        </div>
      </div>

      {/* Image URL + Upload */}
      <div>
        <label className={lbl}>Ảnh sản phẩm</label>
        <div className="flex gap-2">
          <input
            {...register('imageUrl')}
            placeholder="https://... hoặc /uploads/..."
            className={`${inp} flex-1`}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-3 rounded-xl border border-white/20 text-slate-300 hover:text-white hover:border-white/40 hover:bg-white/5 transition-all text-sm shrink-0 disabled:opacity-50"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? 'Đang upload...' : 'Upload'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/svg+xml,image/gif"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>
        {errors.imageUrl && <p className={err}>{errors.imageUrl.message}</p>}

        {/* Preview */}
        {imageUrl && (
          <div className="mt-3 relative inline-block">
            <div className="w-24 h-24 rounded-xl border border-white/10 overflow-hidden bg-white/5 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt="preview" className="w-full h-full object-contain" />
            </div>
            <button
              type="button"
              onClick={() => setValue('imageUrl', '')}
              className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-xs hover:bg-red-400 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
        {!imageUrl && (
          <div className="mt-2 flex items-center gap-2 text-slate-600 text-xs">
            <ImageIcon className="w-3.5 h-3.5" />
            Chưa có ảnh — dùng icon emoji làm mặc định
          </div>
        )}
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
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
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
