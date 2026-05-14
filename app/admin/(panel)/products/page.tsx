'use client'

import { useEffect, useState } from 'react'
import AdminHeader from '@/components/admin/AdminHeader'
import ProductForm from '@/components/admin/ProductForm'
import VariantEditor from '@/components/admin/VariantEditor'
import { formatPrice } from '@/lib/utils'
import { Plus, Pencil, Eye, EyeOff, Trash2, Package, Star, X } from 'lucide-react'

interface AdminVariant {
  id: string
  name: string
  duration: string
  type: string
  price: number
  warrantyText: string
  description: string | null
  badge: string | null
  available: boolean
  isActive: boolean
  sortOrder: number
}

interface AdminProduct {
  id: string
  name: string
  slug: string
  category: string
  description: string
  priceFrom: number
  badge: string | null
  icon: string
  imageUrl: string | null
  isActive: boolean
  isFeatured: boolean
  sortOrder: number
  plans: AdminVariant[]
  _count: { orders: number }
}

export default function ProductsPage() {
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editProduct, setEditProduct] = useState<AdminProduct | null>(null)

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/products')
      const data = await res.json()
      setProducts(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchProducts() }, [])

  const toggleActive = async (product: AdminProduct) => {
    await fetch(`/api/admin/products/${product.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !product.isActive }),
    })
    fetchProducts()
  }

  const deleteProduct = async (id: string) => {
    if (!confirm('Xóa sản phẩm này? (Sản phẩm có đơn hàng sẽ bị ẩn thay vì xóa)')) return
    await fetch(`/api/admin/products/${id}`, { method: 'DELETE' })
    fetchProducts()
  }

  const handleFormSuccess = () => {
    setShowAddForm(false)
    setEditProduct(null)
    fetchProducts()
  }

  return (
    <>
      <AdminHeader title="Quản lý sản phẩm" adminEmail="admin@thanhlongshop.net" />
      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-6xl mx-auto space-y-5">

          {/* Top bar */}
          <div className="flex items-center justify-between">
            <p className="text-slate-400 text-sm">
              Tổng: <span className="text-white font-semibold">{products.length}</span> sản phẩm
            </p>
            <button
              onClick={() => { setShowAddForm(true); setEditProduct(null) }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-white font-semibold text-sm shadow-lg shadow-cyan-500/20 hover:opacity-90 transition-all"
            >
              <Plus className="w-4 h-4" />
              Thêm sản phẩm
            </button>
          </div>

          {/* Add form */}
          {showAddForm && (
            <div className="glass rounded-2xl border border-white/10 p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-white font-bold text-lg">Thêm sản phẩm mới</h3>
                <button onClick={() => setShowAddForm(false)} className="text-slate-400 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <ProductForm onSuccess={handleFormSuccess} onCancel={() => setShowAddForm(false)} />
            </div>
          )}

          {/* Edit panel — shown below top bar, above list */}
          {editProduct && (
            <div className="glass rounded-2xl border border-cyan-500/20 p-6 space-y-8">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-bold text-lg">
                  Chỉnh sửa: <span className="gradient-text">{editProduct.name}</span>
                </h3>
                <button onClick={() => setEditProduct(null)} className="text-slate-400 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Product form */}
              <div>
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-4">
                  Thông tin sản phẩm
                </p>
                <ProductForm
                  initial={{
                    id: editProduct.id,
                    name: editProduct.name,
                    slug: editProduct.slug,
                    category: editProduct.category as 'AI' | 'Thiết kế' | 'Giải trí' | 'Học tập' | 'Văn phòng',
                    description: editProduct.description,
                    priceFrom: editProduct.priceFrom,
                    badge: editProduct.badge ?? undefined,
                    icon: editProduct.icon,
                    imageUrl: editProduct.imageUrl ?? undefined,
                    isActive: editProduct.isActive,
                    isFeatured: editProduct.isFeatured,
                    sortOrder: editProduct.sortOrder,
                  }}
                  onSuccess={handleFormSuccess}
                  onCancel={() => setEditProduct(null)}
                />
              </div>

              {/* Variant editor */}
              <div className="border-t border-white/10 pt-6">
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-4">
                  Gói / Option sản phẩm
                </p>
                <VariantEditor
                  productId={editProduct.id}
                  initialVariants={editProduct.plans}
                />
              </div>
            </div>
          )}

          {/* Products list */}
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-20 text-slate-500">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Chưa có sản phẩm nào</p>
            </div>
          ) : (
            <div className="space-y-3">
              {products.map((product) => {
                const activeVariants = product.plans.filter(p => p.isActive)
                const isEditing = editProduct?.id === product.id

                return (
                  <div
                    key={product.id}
                    className={`glass rounded-2xl border transition-all ${
                      isEditing
                        ? 'border-cyan-500/30'
                        : product.isActive
                        ? 'border-white/10'
                        : 'border-white/5 opacity-60'
                    }`}
                  >
                    <div className="p-5 flex flex-wrap items-center gap-4">
                      {/* Image / icon + name */}
                      <div className="flex items-center gap-3 flex-1 min-w-[200px]">
                        {product.imageUrl ? (
                          <div className="w-10 h-10 rounded-xl overflow-hidden bg-white/10 shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-contain" />
                          </div>
                        ) : (
                          <span className="text-2xl shrink-0">{product.icon}</span>
                        )}
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-white font-bold">{product.name}</p>
                            {product.isFeatured && (
                              <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                            )}
                            {product.badge && (
                              <span className="px-2 py-0.5 rounded-full text-xs bg-cyan-500/20 border border-cyan-500/30 text-cyan-300">
                                {product.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-slate-500 text-xs">{product.category} · {product.slug}</p>
                        </div>
                      </div>

                      {/* Variant pills */}
                      <div className="hidden md:flex flex-wrap gap-1.5">
                        {activeVariants.map((v) => (
                          <span
                            key={v.id}
                            className={`px-2.5 py-1 rounded-lg border text-xs ${
                              v.available
                                ? 'bg-white/5 border-white/10 text-slate-300'
                                : 'bg-orange-500/5 border-orange-500/20 text-orange-400/70'
                            }`}
                          >
                            {v.name}: {formatPrice(v.price)}
                            {!v.available && ' ✕'}
                          </span>
                        ))}
                      </div>

                      {/* Stats */}
                      <div className="text-center hidden lg:block">
                        <p className="text-white font-bold">{product._count.orders}</p>
                        <p className="text-slate-500 text-xs">đơn hàng</p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 ml-auto">
                        <button
                          onClick={() => toggleActive(product)}
                          className={`p-2 rounded-lg transition-all ${
                            product.isActive
                              ? 'text-emerald-400 hover:bg-emerald-500/10'
                              : 'text-slate-500 hover:bg-white/10'
                          }`}
                          title={product.isActive ? 'Ẩn sản phẩm' : 'Hiện sản phẩm'}
                        >
                          {product.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => setEditProduct(isEditing ? null : product)}
                          className={`p-2 rounded-lg transition-all ${
                            isEditing
                              ? 'text-cyan-400 bg-cyan-500/10'
                              : 'text-cyan-400 hover:bg-cyan-500/10'
                          }`}
                          title="Chỉnh sửa"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteProduct(product.id)}
                          className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-all"
                          title="Xóa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </>
  )
}
