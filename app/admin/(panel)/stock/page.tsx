'use client'

import { useEffect, useState, useCallback } from 'react'
import AdminHeader from '@/components/admin/AdminHeader'
import { formatPrice } from '@/lib/utils'
import {
  Plus, Upload, Package, Trash2, Eye, EyeOff, RefreshCw,
  ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, XCircle,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────
interface PlanStats {
  planId: string
  planName: string
  planPrice: number
  available: number
  sold: number
  disabled: number
}

interface ProductStats {
  productId: string
  productName: string
  productIcon: string
  plans: PlanStats[]
  totalAvailable: number
}

interface AccountRow {
  id: string
  username: string
  password: string
  extraInfo: string
  status: string
  soldAt: string | null
  createdAt: string
  order: { orderCode: string; customerName: string } | null
}

interface Product {
  id: string
  name: string
  icon: string
  plans: Array<{ id: string; name: string; price: number }>
}

// ── Helpers ─────────────────────────────────────────────────────────────
const STATUS_LABEL: Record<string, { label: string; color: string; Icon: typeof CheckCircle2 }> = {
  available: { label: 'Còn hàng', color: 'text-emerald-400', Icon: CheckCircle2 },
  sold:      { label: 'Đã bán',   color: 'text-slate-400',   Icon: CheckCircle2 },
  disabled:  { label: 'Đã ẩn',    color: 'text-orange-400',  Icon: EyeOff },
}

const inp = 'w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-cyan-400/50 transition-all'

export default function StockPage() {
  const [stats, setStats] = useState<ProductStats[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loadingStats, setLoadingStats] = useState(true)

  // Filter / list
  const [filterProduct, setFilterProduct] = useState('')
  const [filterPlan, setFilterPlan] = useState('')
  const [filterStatus, setFilterStatus] = useState('available')
  const [accounts, setAccounts] = useState<AccountRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loadingList, setLoadingList] = useState(false)

  // Import
  const [showImport, setShowImport] = useState(false)
  const [importProduct, setImportProduct] = useState('')
  const [importPlan, setImportPlan] = useState('')
  const [importText, setImportText] = useState('')
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    setLoadingStats(true)
    try {
      const res = await fetch('/api/admin/stock/stats')
      const data = await res.json()
      setStats(Array.isArray(data) ? data : [])
    } finally {
      setLoadingStats(false)
    }
  }, [])

  const fetchProducts = useCallback(async () => {
    const res = await fetch('/api/admin/products')
    const data = await res.json()
    type RawPlan = { id: string; name: string; price: number; isActive?: boolean }
    type RawProduct = { id: string; name: string; icon: string; plans?: RawPlan[] }
    setProducts(
      (Array.isArray(data) ? data : []).map((p: RawProduct) => ({
        id: p.id,
        name: p.name,
        icon: p.icon,
        plans: (p.plans || []).filter((pl) => pl.isActive !== false).map((pl) => ({
          id: pl.id,
          name: pl.name,
          price: pl.price,
        })),
      }))
    )
  }, [])

  const fetchAccounts = useCallback(async () => {
    setLoadingList(true)
    try {
      const params = new URLSearchParams({
        ...(filterProduct ? { productId: filterProduct } : {}),
        ...(filterPlan ? { planId: filterPlan } : {}),
        ...(filterStatus ? { status: filterStatus } : {}),
        page: String(page),
      })
      const res = await fetch(`/api/admin/stock?${params}`)
      const data = await res.json()
      setAccounts(data.items || [])
      setTotal(data.total || 0)
    } finally {
      setLoadingList(false)
    }
  }, [filterProduct, filterPlan, filterStatus, page])

  useEffect(() => { fetchStats(); fetchProducts() }, [fetchStats, fetchProducts])
  useEffect(() => { setPage(1) }, [filterProduct, filterPlan, filterStatus])
  useEffect(() => { fetchAccounts() }, [fetchAccounts])

  const selectedProductPlans = products.find((p) => p.id === filterProduct)?.plans || []
  const importPlans = products.find((p) => p.id === importProduct)?.plans || []

  const [importErrors, setImportErrors] = useState<{ line: number; raw: string; reason: string }[]>([])

  const handleImport = async () => {
    if (!importProduct || !importPlan || !importText.trim()) return
    setImporting(true)
    setImportResult(null)
    setImportErrors([])
    try {
      // Preserve all lines including those with special chars; filter only truly empty ones
      const lines = importText.split('\n').filter((l) => l.trim().length > 0)
      const res = await fetch('/api/admin/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: importProduct, planId: importPlan, lines }),
      })
      const data = await res.json()

      if (data.success) {
        const skippedMsg = data.skipped > 0 ? ` — ${data.skipped} dòng bỏ qua` : ''
        setImportResult(`✅ Đã nạp ${data.imported} tài khoản vào kho${skippedMsg}`)
        if (data.imported > 0) {
          setImportText('')
          fetchStats()
          fetchAccounts()
        }
        if (data.errors?.length > 0) setImportErrors(data.errors)
      } else {
        setImportResult(`❌ ${data.error || 'Lỗi khi import'}`)
      }
    } catch {
      setImportResult('❌ Không thể kết nối server')
    } finally {
      setImporting(false)
    }
  }

  const toggleStatus = async (id: string, current: string) => {
    const next = current === 'available' ? 'disabled' : 'available'
    await fetch(`/api/admin/stock/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    })
    fetchAccounts()
    fetchStats()
  }

  const deleteAccount = async (id: string) => {
    if (!confirm('Xóa tài khoản này khỏi kho?')) return
    await fetch(`/api/admin/stock/${id}`, { method: 'DELETE' })
    fetchAccounts()
    fetchStats()
  }

  const totalAvailable = stats.reduce((s, p) => s + p.totalAvailable, 0)
  const totalSold = stats.flatMap((p) => p.plans).reduce((s, pl) => s + pl.sold, 0)

  return (
    <>
      <AdminHeader title="Kho tài khoản" adminEmail="admin@thanhlongshop.net" />
      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-7xl mx-auto space-y-5">

          {/* Top stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Tổng còn hàng', value: totalAvailable, color: 'text-emerald-400' },
              { label: 'Đã bán', value: totalSold, color: 'text-slate-300' },
              { label: 'Sản phẩm có kho', value: stats.filter((p) => p.totalAvailable > 0).length, color: 'text-cyan-400' },
              { label: 'Gói có kho', value: stats.flatMap((p) => p.plans).filter((pl) => pl.available > 0).length, color: 'text-purple-400' },
            ].map((s) => (
              <div key={s.label} className="glass rounded-xl border border-white/10 p-4">
                <p className="text-slate-500 text-xs mb-1">{s.label}</p>
                <p className={`text-2xl font-bold ${s.color}`}>{loadingStats ? '—' : s.value}</p>
              </div>
            ))}
          </div>

          {/* Per-product stock overview */}
          {!loadingStats && stats.length > 0 && (
            <div className="glass rounded-2xl border border-white/10 p-5">
              <p className="text-white font-semibold text-sm mb-4">Tổng quan kho theo sản phẩm</p>
              <div className="space-y-3">
                {stats.map((prod) => (
                  <div key={prod.productId}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{prod.productIcon}</span>
                      <span className="text-white font-medium text-sm">{prod.productName}</span>
                      {prod.totalAvailable === 0 && (
                        <span className="ml-2 flex items-center gap-1 text-orange-400 text-xs">
                          <AlertTriangle className="w-3 h-3" />Hết hàng
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 pl-7">
                      {prod.plans.map((pl) => (
                        <div
                          key={pl.planId}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs ${
                            pl.available === 0
                              ? 'border-orange-500/20 bg-orange-500/5'
                              : 'border-white/10 bg-white/5'
                          }`}
                        >
                          <span className="text-slate-300">{pl.planName}</span>
                          <span className={`font-bold ${pl.available > 0 ? 'text-emerald-400' : 'text-orange-400'}`}>
                            {pl.available} còn
                          </span>
                          <span className="text-slate-600">· {pl.sold} đã bán</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Import section */}
          <div className="glass rounded-2xl border border-white/10 overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-6 py-4 hover:bg-white/5 transition-all"
              onClick={() => setShowImport(!showImport)}
            >
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-cyan-400" />
                <span className="text-white font-semibold text-sm">Nạp tài khoản vào kho</span>
              </div>
              {showImport ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {showImport && (
              <div className="px-6 pb-6 pt-2 border-t border-white/10 space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-300 text-sm font-medium mb-1.5">Sản phẩm</label>
                    <select
                      value={importProduct}
                      onChange={(e) => { setImportProduct(e.target.value); setImportPlan('') }}
                      className={inp}
                    >
                      <option value="">Chọn sản phẩm...</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id} className="bg-[#0f172a]">
                          {p.icon} {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-300 text-sm font-medium mb-1.5">Gói</label>
                    <select
                      value={importPlan}
                      onChange={(e) => setImportPlan(e.target.value)}
                      disabled={!importProduct}
                      className={`${inp} disabled:opacity-50`}
                    >
                      <option value="">Chọn gói...</option>
                      {importPlans.map((pl) => (
                        <option key={pl.id} value={pl.id} className="bg-[#0f172a]">
                          {pl.name} — {formatPrice(pl.price)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-1.5">
                    Danh sách tài khoản
                    <span className="ml-2 text-slate-500 font-normal">
                      Mỗi dòng: <code className="bg-white/5 px-1 rounded">username|password</code> hoặc <code className="bg-white/5 px-1 rounded">username|password|ghi chú</code>
                    </span>
                  </label>
                  <textarea
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    rows={8}
                    placeholder={`user1@example.com|Pass123\nuser2@example.com|Pass456|Hạn 1 tháng\nuser3@example.com|Pass789|Không gia hạn`}
                    className={`${inp} font-mono text-xs resize-none`}
                  />
                  <p className="text-slate-600 text-xs mt-1">
                    {importText.split('\n').filter((l) => l.trim() && l.includes('|')).length} dòng hợp lệ
                  </p>
                </div>

                {importResult && (
                  <p className={`text-sm font-medium ${importResult.startsWith('✅') ? 'text-emerald-400' : 'text-red-400'}`}>
                    {importResult}
                  </p>
                )}

                {importErrors.length > 0 && (
                  <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-3 space-y-1">
                    <p className="text-orange-400 text-xs font-semibold mb-2">
                      {importErrors.length} dòng bị bỏ qua:
                    </p>
                    {importErrors.map((e, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs">
                        {e.line > 0 && (
                          <span className="text-slate-500 shrink-0 font-mono">Dòng {e.line}:</span>
                        )}
                        <span className="text-orange-300/80 font-mono truncate max-w-[200px]" title={e.raw}>
                          {e.raw.length > 30 ? e.raw.slice(0, 30) + '…' : e.raw}
                        </span>
                        <span className="text-slate-500">→ {e.reason}</span>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={handleImport}
                  disabled={importing || !importProduct || !importPlan || !importText.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-white font-semibold text-sm disabled:opacity-50 transition-all"
                >
                  {importing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {importing ? 'Đang import...' : 'Nạp vào kho'}
                </button>
              </div>
            )}
          </div>

          {/* Filter + list */}
          <div className="glass rounded-2xl border border-white/10 overflow-hidden">
            <div className="px-6 py-4 border-b border-white/10">
              <p className="text-white font-semibold text-sm mb-3">Danh sách tài khoản trong kho</p>
              <div className="grid sm:grid-cols-3 gap-3">
                <select
                  value={filterProduct}
                  onChange={(e) => { setFilterProduct(e.target.value); setFilterPlan('') }}
                  className={inp}
                >
                  <option value="">Tất cả sản phẩm</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id} className="bg-[#0f172a]">
                      {p.icon} {p.name}
                    </option>
                  ))}
                </select>
                <select
                  value={filterPlan}
                  onChange={(e) => setFilterPlan(e.target.value)}
                  disabled={!filterProduct}
                  className={`${inp} disabled:opacity-50`}
                >
                  <option value="">Tất cả gói</option>
                  {selectedProductPlans.map((pl) => (
                    <option key={pl.id} value={pl.id} className="bg-[#0f172a]">{pl.name}</option>
                  ))}
                </select>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className={inp}
                >
                  <option value="">Tất cả trạng thái</option>
                  <option value="available">Còn hàng</option>
                  <option value="sold">Đã bán</option>
                  <option value="disabled">Đã ẩn</option>
                </select>
              </div>
            </div>

            {loadingList ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-7 h-7 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : accounts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                <Package className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm">Không có tài khoản nào</p>
              </div>
            ) : (
              <>
                <div className="divide-y divide-white/5">
                  {accounts.map((acc) => {
                    const st = STATUS_LABEL[acc.status] || STATUS_LABEL.available
                    return (
                      <div key={acc.id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-white/[0.02] transition-all">
                        {/* Status dot */}
                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          acc.status === 'available' ? 'bg-emerald-400' :
                          acc.status === 'sold' ? 'bg-slate-500' : 'bg-orange-400'
                        }`} />

                        {/* Credentials */}
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-mono font-medium truncate">{acc.username}</p>
                          <p className="text-slate-500 text-xs font-mono truncate">
                            {acc.status === 'available' ? acc.password : '••••••••'}
                          </p>
                          {acc.extraInfo && (
                            <p className="text-slate-600 text-xs truncate">{acc.extraInfo}</p>
                          )}
                        </div>

                        {/* Status + order info */}
                        <div className="text-right hidden sm:block shrink-0">
                          <span className={`text-xs font-medium ${st.color}`}>{st.label}</span>
                          {acc.order && (
                            <p className="text-slate-600 text-xs mt-0.5 font-mono">{acc.order.orderCode}</p>
                          )}
                        </div>

                        {/* Actions — only for non-sold accounts */}
                        {acc.status !== 'sold' && (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => toggleStatus(acc.id, acc.status)}
                              className={`p-2 rounded-lg transition-all ${
                                acc.status === 'available'
                                  ? 'text-emerald-400 hover:bg-emerald-500/10'
                                  : 'text-slate-500 hover:bg-white/10'
                              }`}
                              title={acc.status === 'available' ? 'Ẩn khỏi kho' : 'Kích hoạt lại'}
                            >
                              {acc.status === 'available'
                                ? <Eye className="w-4 h-4" />
                                : <EyeOff className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => deleteAccount(acc.id)}
                              className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-all"
                              title="Xóa"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}

                        {acc.status === 'sold' && (
                          <XCircle className="w-4 h-4 text-slate-600 shrink-0" />
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Pagination */}
                {total > 50 && (
                  <div className="flex items-center justify-between px-6 py-3 border-t border-white/10">
                    <p className="text-slate-500 text-xs">
                      {(page - 1) * 50 + 1}–{Math.min(page * 50, total)} / {total}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-3 py-1.5 rounded-lg border border-white/10 text-slate-400 text-xs disabled:opacity-40 hover:bg-white/5"
                      >
                        ← Trước
                      </button>
                      <button
                        onClick={() => setPage((p) => p + 1)}
                        disabled={page * 50 >= total}
                        className="px-3 py-1.5 rounded-lg border border-white/10 text-slate-400 text-xs disabled:opacity-40 hover:bg-white/5"
                      >
                        Sau →
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </>
  )
}
