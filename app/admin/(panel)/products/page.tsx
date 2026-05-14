'use client'

import { useEffect, useState } from 'react'
import AdminHeader from '@/components/admin/AdminHeader'
import ProductForm from '@/components/admin/ProductForm'
import VariantEditor from '@/components/admin/VariantEditor'
import ProductPreview from '@/components/admin/ProductPreview'
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
  const [previewVariants, setPreviewVariants] = useState<AdminVariant[]>([])

  const fetchProducts = async (keepEditId?: string) => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/products')
      const data: AdminProduct[] = await res.json()
      setProducts(data)
      if (keepEditId) {
        const updated = data.find(p => p.id === keepEditId)
        if (updated) {
          setEditProduct(updated)
          setPreviewVariants(updated.plans)
        }
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchProducts() }, [])

  const openEdit = (product: AdminProduct) => {
    setEditProduct(product)
    setPreviewVariants(product.plans)
    setShowAddForm(false)
  }

  const closeEdit = () => {
    setEditProduct(null)
    setPreviewVariants([])
  }

  const toggleActive = async (product: AdminProduct) => {
    await fetch(`/api/admin/products/${product.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !product.isActive }),
    })
    fetchProducts(editProduct?.id)
  }

  const deleteProduct = async (id: string) => {
    if (!confirm('Xóa sản phẩm này? (Sản phẩm có đơn hàng sẽ bị ẩn thay vì xóa)')) return
    await fetch(`/api/admin/products/${id}`, { method: 'DELETE' })
    if (editProduct?.id === id) closeEdit()
    fetchProducts()
  }

  const handleFormSuccess = () => {
    setShowAddForm(false)
    fetchProducts(editProduct?.id)
  }

  return (
    <>
      <AdminHeader title="Quản lý sản phẩm" adminEmail="admin@thanhlongshop.net" />
      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-7xl mx-auto space-y-5">

          {/* Top bar */}
          <div className="flex items-center justify-between">
            <p className="text-slate-400 text-sm">
              Tổng: <span className="text-white font-semibold">{products.length}</span> sản phẩm
            </p>
            <button
              onClick={() => { setShowAddForm(true); closeEdit() }}
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

          {/* ── Edit panel — 3 blocks ── */}
          {editProduct && (
            <div className="glass rounded-2xl border border-cyan-500/20 overflow-hidden">
              {/* Panel header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{editProduct.icon}</span>
                  <div>
                    <h3 className="text-white font-bold">
                      Chỉnh sửa: <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">{editProduct.name}</span>
                    </h3>
                    <p className="text-slate-500 text-xs">{editProduct.category} · {editProduct.slug}</p>
                  </div>
                </div>
                <button onClick={closeEdit} className="text-slate-400 hover:text-white transition-colors p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 2-column layout: left (form + options) | right (preview) */}
              <div className="flex flex-col lg:flex-row">

                {/* Left column: Block 1 + Block 2 */}
                <div className="flex-1 min-w-0 divide-y divide-white/10">

                  {/* Block 1 — Thông tin sản phẩm */}
                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-5">
                      <div className="w-1 h-5 rounded-full bg-gradient-to-b from-cyan-500 to-emerald-500" />
                      <p className="text-white text-sm font-semibold">Thông tin sản phẩm</p>
                    </div>
                    <ProductForm
                      key={editProduct.id}
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
                      onCancel={closeEdit}
                    />
                  </div>

                  {/* Block 2 — Gói bán */}
                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-5">
                      <div className="w-1 h-5 rounded-full bg-gradient-to-b from-emerald-500 to-cyan-500" />
                      <p className="text-white text-sm font-semibold">Gói bán / Option</p>
                    </div>
                    <VariantEditor
                      key={editProduct.id}
                      productId={editProduct.id}
                      initialVariants={editProduct.plans}
                      onVariantsChange={setPreviewVariants}
                    />
                  </div>
                </div>

                {/* Right column: Block 3 — Preview (sticky on desktop) */}
                <div className="lg:w-80 xl:w-96 shrink-0 border-t lg:border-t-0 lg:border-l border-white/10">
                  <div className="lg:sticky lg:top-0 p-6 max-h-screen overflow-y-auto">
                    <ProductPreview
                      product={{
                        name: editProduct.name,
                        icon: editProduct.icon,
                        imageUrl: editProduct.imageUrl,
                        description: editProduct.description,
                        badge: editProduct.badge,
                        category: editProduct.category,
                      }}
                      variants={previewVariants}
                    />
                  </div>
                </div>
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
            <div className="space-y-2">
              {products.map(product => {
                const activeVariants = product.plans.filter(p => p.isActive && p.available)
                const minPrice = activeVariants.length > 0
                  ? Math.min(...activeVariants.map(v => v.price))
                  : product.priceFrom
                const isEditing = editProduct?.id === product.id

                return (
                  <div
                    key={product.id}
                    className={`glass rounded-xl border transition-all ${
                      isEditing ? 'border-cyan-500/30' : product.isActive ? 'border-white/10' : 'border-white/5 opacity-55'
                    }`}
                  >
                    <div className="p-4 flex flex-wrap items-center gap-4">
                      {/* Icon + name */}
                      <div className="flex items-center gap-3 flex-1 min-w-[180px]">
                        {product.imageUrl ? (
                          <div className="w-9 h-9 rounded-lg overflow-hidden bg-white/10 shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-contain" />
                          </div>
                        ) : (
                          <span className="text-2xl shrink-0">{product.icon}</span>
                        )}
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-white font-semibold text-sm">{product.name}</p>
                            {product.isFeatured && <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />}
                            {product.badge && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] bg-cyan-500/20 border border-cyan-500/30 text-cyan-300">
                                {product.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-slate-500 text-xs">{product.category} · {product.plans.filter(p => p.isActive).length} gói</p>
                        </div>
                      </div>

                      {/* Variant pills — desktop */}
                      <div className="hidden lg:flex flex-wrap gap-1.5">
                        {product.plans.filter(p => p.isActive).map(v => (
                          <span
                            key={v.id}
                            className={`px-2 py-0.5 rounded-md border text-[11px] ${
                              v.available
                                ? 'border-white/10 text-slate-300'
                                : 'border-orange-500/20 text-orange-400/70'
                            }`}
                          >
                            {v.name}: {formatPrice(v.price)}
                            {!v.available && ' ✕'}
                          </span>
                        ))}
                      </div>

                      {/* Price + orders */}
                      <div className="text-right hidden md:block shrink-0">
                        <p className="text-emerald-400 font-bold text-sm">{minPrice > 0 ? `Từ ${formatPrice(minPrice)}` : '—'}</p>
                        <p className="text-slate-500 text-xs">{product._count.orders} đơn</p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 ml-auto">
                        <button
                          onClick={() => toggleActive(product)}
                          className={`p-2 rounded-lg transition-all ${product.isActive ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-slate-500 hover:bg-white/10'}`}
                          title={product.isActive ? 'Ẩn sản phẩm' : 'Hiện sản phẩm'}
                        >
                          {product.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => isEditing ? closeEdit() : openEdit(product)}
                          className={`p-2 rounded-lg transition-all ${isEditing ? 'text-cyan-400 bg-cyan-500/10' : 'text-cyan-400 hover:bg-cyan-500/10'}`}
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
