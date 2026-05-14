'use client'

import { formatPrice } from '@/lib/utils'

interface PreviewVariant {
  id: string
  name: string
  price: number
  warrantyText: string
  description: string | null
  badge: string | null
  available: boolean
  sortOrder: number
}

interface PreviewProduct {
  name: string
  icon: string
  imageUrl: string | null
  description: string
  badge: string | null
  category: string
}

interface Props {
  product: PreviewProduct
  variants: PreviewVariant[]
}

export default function ProductPreview({ product, variants }: Props) {
  const active = variants.filter(v => v.available)
  const sorted = [...variants].sort((a, b) => a.sortOrder - b.sortOrder)
  const minPrice = active.length > 0
    ? Math.min(...active.map(v => v.price))
    : variants.length > 0 ? Math.min(...variants.map(v => v.price)) : 0

  return (
    <div className="space-y-5">
      <div>
        <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">
          Xem trước ngoài website
        </p>
        <p className="text-slate-600 text-xs">
          Cập nhật ngay khi sửa gói. Lưu sản phẩm để xem tên/mô tả mới.
        </p>
      </div>

      {/* Card sản phẩm */}
      <div>
        <p className="text-slate-500 text-[11px] uppercase tracking-wide mb-2">Card sản phẩm</p>
        <div className="glass rounded-2xl p-5 border border-white/10">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              {product.imageUrl ? (
                <div className="w-11 h-11 rounded-xl overflow-hidden bg-white/10 shrink-0 flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={product.imageUrl} alt="" className="w-full h-full object-contain" />
                </div>
              ) : (
                <span className="text-3xl leading-none">{product.icon || '📦'}</span>
              )}
              <div>
                <p className="text-white font-bold text-sm leading-snug">
                  {product.name || 'Tên sản phẩm'}
                </p>
                <p className="text-slate-500 text-xs">{product.category}</p>
              </div>
            </div>
            {product.badge && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 border border-cyan-500/30 text-cyan-300 shrink-0">
                {product.badge}
              </span>
            )}
          </div>
          <p className="text-slate-400 text-xs leading-relaxed mb-3 line-clamp-2">
            {product.description || 'Mô tả sản phẩm...'}
          </p>
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-1">
              <span className="text-slate-400 text-xs">Từ</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400 font-extrabold text-lg">
                {minPrice > 0 ? formatPrice(minPrice) : '—'}
              </span>
            </div>
            <span className="text-xs text-slate-500">
              {active.length > 0 ? `${active.length} gói` : 'Hết hàng'}
            </span>
          </div>
        </div>
      </div>

      {/* Popup chọn gói */}
      <div>
        <p className="text-slate-500 text-[11px] uppercase tracking-wide mb-2">Popup chọn gói</p>
        <div className="space-y-1.5">
          {sorted.length === 0 ? (
            <p className="text-slate-600 text-xs italic text-center py-5 border border-dashed border-white/10 rounded-xl">
              Chưa có gói nào
            </p>
          ) : (
            sorted.map(v => (
              <div
                key={v.id}
                className={`px-3.5 py-3 rounded-xl border transition-all ${
                  !v.available
                    ? 'border-white/5 opacity-50'
                    : 'border-white/10 bg-white/[0.03]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-white font-semibold text-xs">{v.name}</p>
                      {v.badge && (
                        <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 border border-cyan-500/30 text-cyan-300">
                          {v.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-slate-400 text-[11px] mt-0.5">{v.warrantyText || 'KBH'}</p>
                    {v.description && (
                      <p className="text-slate-600 text-[11px]">{v.description}</p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-slate-200 font-bold text-sm">{formatPrice(v.price)}</p>
                    <span className={`text-[10px] font-medium ${v.available ? 'text-emerald-400' : 'text-orange-400'}`}>
                      {v.available ? '● Còn hàng' : '● Hết hàng'}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
