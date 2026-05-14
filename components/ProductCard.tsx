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
  const minPrice = product.plans.length > 0
    ? Math.min(...product.plans.map((p) => p.price))
    : product.priceFrom

  return (
    <div className="glass rounded-2xl p-6 card-hover border border-white/10 hover:border-cyan-400/30 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <ProductLogo slug={product.slug} size={48} />
          <div>
            <h3 className="text-white font-bold text-lg leading-tight">{product.name}</h3>
            <span className="text-xs text-slate-400 font-medium">{product.category}</span>
          </div>
        </div>
        {product.badge && (
          <span className="shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 border border-cyan-500/30 text-cyan-300">
            {product.badge}
          </span>
        )}
      </div>

      {/* Description */}
      <p className="text-slate-400 text-sm leading-relaxed flex-1">{product.description}</p>

      {/* Plans */}
      {product.plans.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {product.plans.map((plan) => (
            <span
              key={plan.id}
              className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-300 text-xs"
            >
              {plan.duration}
            </span>
          ))}
        </div>
      )}

      {/* Price */}
      <div className="flex items-baseline gap-1">
        <span className="text-slate-400 text-sm">Từ</span>
        <span className="gradient-text text-2xl font-extrabold">{formatPrice(minPrice)}</span>
        <span className="text-slate-400 text-sm">/ tháng</span>
      </div>

      {/* Buttons */}
      <div className="flex gap-3 pt-1">
        <button
          onClick={() => onBuyNow(product)}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-white font-semibold text-sm transition-all duration-200 active:scale-95 shadow-lg shadow-cyan-500/20"
        >
          <ShoppingCart className="w-4 h-4" />
          Mua ngay
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
