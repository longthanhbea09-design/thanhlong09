'use client'

import { useState, useMemo } from 'react'
import { Search, Package } from 'lucide-react'
import ProductCard from './ProductCard'
import FadeIn from './FadeIn'
import type { Product } from '@/types'
import { CATEGORIES } from '@/lib/utils'

interface ProductSectionProps {
  products: Product[]
  onBuyNow: (product: Product) => void
}

export default function ProductSection({ products, onBuyNow }: ProductSectionProps) {
  const [activeCategory, setActiveCategory] = useState('Tất cả')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchCat = activeCategory === 'Tất cả' || p.category === activeCategory
      const matchSearch =
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.description.toLowerCase().includes(search.toLowerCase())
      return matchCat && matchSearch
    })
  }, [products, activeCategory, search])

  return (
    <section id="products" className="py-20 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <FadeIn className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-cyan-400 text-sm mb-4">
            <Package className="w-4 h-4" />
            Sản phẩm nổi bật
          </div>
          <h2 className="section-title">Chọn gói dịch vụ phù hợp với bạn</h2>
          <p className="section-subtitle">
            Tất cả gói đều có hỗ trợ cài đặt, hướng dẫn sử dụng và bảo hành rõ ràng
          </p>
        </FadeIn>

        {/* Search */}
        <div className="relative max-w-md mx-auto mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm kiếm sản phẩm..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-11 text-base"
          />
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                activeCategory === cat
                  ? 'bg-gradient-to-r from-cyan-500 to-emerald-500 text-white shadow-lg shadow-cyan-500/25'
                  : 'bg-white/5 border border-white/10 text-slate-300 hover:border-white/30 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Products grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <Package className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg">Không tìm thấy sản phẩm phù hợp</p>
            <button
              onClick={() => { setSearch(''); setActiveCategory('Tất cả') }}
              className="mt-4 text-cyan-400 hover:underline"
            >
              Xem tất cả sản phẩm
            </button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map((product, i) => (
              <FadeIn key={product.id} delay={i * 100}>
                <ProductCard product={product} onBuyNow={onBuyNow} />
              </FadeIn>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
