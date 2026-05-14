'use client'

import { useEffect, useState } from 'react'
import AdminHeader from '@/components/admin/AdminHeader'
import ProductForm from '@/components/admin/ProductForm'
import { formatPrice } from '@/lib/utils'
import { Plus, Pencil, Eye, EyeOff, Trash2, Package, Star } from 'lucide-react'

interface AdminProduct {
  id: string
  name: string
  slug: string
  category: string
  description: string
  priceFrom: number
  badge: string | null
  icon: string
  isActive: boolean
  isFeatured: boolean
  plans: Array<{ id: string; name: string; price: number; duration: string }>
  _count: { orders: number }
}

export default function ProductsPage() {
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
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
    setShowForm(false)
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
              onClick={() => { setEditProduct(null); setShowForm(true) }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-white font-semibold text-sm shadow-lg shadow-cyan-500/20 hover:opacity-90 transition-all"
            >
              <Plus className="w-4 h-4" />
              Thêm sản phẩm
            </button>
          </div>

          {/* Add/Edit form */}
          {(showForm || editProduct) && (
            <div className="glass rounded-2xl border border-white/10 p-6">
              <h3 className="text-white font-bold text-lg mb-5">
                {editProduct ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'}
              </h3>
              <ProductForm
                initial={editProduct ? {
                  id: editProduct.id,
                  name: editProduct.name,
                  slug: editProduct.slug,
                  category: editProduct.category as 'AI' | 'Thiết kế' | 'Giải trí' | 'Học tập' | 'Văn phòng',
                  description: editProduct.description,
                  priceFrom: editProduct.priceFrom,
                  badge: editProduct.badge ?? undefined,
                  icon: editProduct.icon,
                  isActive: editProduct.isActive,
                  isFeatured: editProduct.isFeatured,
                } : undefined}
                onSuccess={handleFormSuccess}
                onCancel={() => { setShowForm(false); setEditProduct(null) }}
              />
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
              {products.map((product) => (
                <div
                  key={product.id}
                  className={`glass rounded-2xl border p-5 flex flex-wrap items-center gap-4 transition-all ${
                    product.isActive ? 'border-white/10' : 'border-white/5 opacity-60'
                  }`}
                >
                  {/* Icon + name */}
                  <div className="flex items-center gap-3 flex-1 min-w-[200px]">
                    <span className="text-3xl">{product.icon}</span>
                    <div>
                      <div className="flex items-center gap-2">
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

                  {/* Plans */}
                  <div className="hidden md:flex flex-wrap gap-1.5">
                    {product.plans.map((plan) => (
                      <span
                        key={plan.id}
                        className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-300 text-xs"
                      >
                        {plan.name}: {formatPrice(plan.price)}
                      </span>
                    ))}
                  </div>

                  {/* Orders count */}
                  <div className="text-center hidden lg:block">
                    <p className="text-white font-bold">{product._count.orders}</p>
                    <p className="text-slate-500 text-xs">đơn hàng</p>
                  </div>

                  {/* Price from */}
                  <div className="text-right hidden sm:block">
                    <p className="text-emerald-400 font-bold">{formatPrice(product.priceFrom)}</p>
                    <p className="text-slate-500 text-xs">giá từ</p>
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
                      title={product.isActive ? 'Ẩn sản phẩm' : 'Hiển thị sản phẩm'}
                    >
                      {product.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => { setEditProduct(product); setShowForm(false) }}
                      className="p-2 rounded-lg text-cyan-400 hover:bg-cyan-500/10 transition-all"
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
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  )
}
