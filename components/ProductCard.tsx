'use client'

import { ShoppingCart, Info } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import type { Product } from '@/types'
import ProductLogo from './ProductLogo'

interface ProductCardProps {
  product: Product
  onBuyNow: (product: Product) => void
}

export default function ProductCard({ product, onBuyNow }: ProductCardProps) {
  const visiblePlans = product.plans.filter((p) => p.isActive && p.saleStatus !== 'HIDDEN')
  const buyablePlans = visiblePlans.filter(
    (p) => p.saleStatus === 'IN_STOCK' || p.saleStatus === 'PREORDER'
  )
  const isOutOfStock = visiblePlans.length > 0 && buyablePlans.length === 0

  const minPrice =
    buyablePlans.length > 0
      ? Math.min(...buyablePlans.map((p) => p.price))
      : visiblePlans.length > 0
      ? Math.min(...visiblePlans.map((p) => p.price))
      : product.priceFrom

  return (
    <div className="glass rounded-2xl p-6 card-hover border border-white/10 hover:border-cyan-400/30 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {product.imageUrl ? (
            <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/10 shrink-0 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={product.imageUrl} alt={product.name} className="w-full h-full object-contain" />
            </div>
          ) : (
            <ProductLogo slug={product.slug} size={48} />
          )}
          <div>
            <h3 className="text-white font-bold text-lg leading-tight">{product.name}</h3>
            <span className="text-xs text-slate-400 font-medium">{product.category}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          {product.badge && (
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 border border-cyan-500/30 text-cyan-300">
              {product.badge}
            </span>
          )}
          {isOutOfStock && (
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-500/10 border border-orange-500/30 text-orange-400">
              Hết hàng
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      <p className="text-slate-400 text-sm leading-relaxed flex-1">{product.description}</p>

      {/* Plans summary */}
      {buyablePlans.length > 0 && (
        <p className="text-slate-500 text-xs">
          {buyablePlans.length} gói · Bấm mua để chọn gói
        </p>
      )}

      {/* Price */}
      <div className="flex items-baseline gap-1">
        <span className="text-slate-400 text-sm">Từ</span>
        <span className={`text-2xl font-extrabold ${isOutOfStock ? 'text-slate-500' : 'gradient-text'}`}>
          {formatPrice(minPrice)}
        </span>
        <span className="text-slate-400 text-sm">/ tháng</span>
      </div>

      {/* Buttons */}
      <div className="flex gap-3 pt-1">
        <button
          onClick={() => !isOutOfStock && onBuyNow(product)}
          disabled={isOutOfStock}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all duration-200 active:scale-95 ${
            isOutOfStock
              ? 'bg-white/5 border border-white/10 text-slate-500 cursor-not-allowed active:scale-100'
              : 'bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-white shadow-lg shadow-cyan-500/20'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          {isOutOfStock ? 'Hết hàng' : 'Mua ngay'}
        </button>
        <button
          onClick={() => onBuyNow(product)}
          className="px-4 py-3 rounded-xl border border-white/20 hover:border-white/40 hover:bg-white/5 text-slate-300 hover:text-white transition-all duration-200"
          title="Chi tiết sản phẩm"
        >
          <Info className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
