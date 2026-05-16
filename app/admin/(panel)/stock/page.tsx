'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import AdminHeader from '@/components/admin/AdminHeader'
import { formatPrice } from '@/lib/utils'
import {
  Plus, Upload, Package, Trash2, Eye, EyeOff, RefreshCw,
  ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, X,
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
const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  available: { label: 'Còn hàng', color: 'text-emerald-400' },
  sold:      { label: 'Đã bán',   color: 'text-slate-400'   },
  disabled:  { label: 'Đã ẩn',    color: 'text-orange-400'  },
}

const inp = 'w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-cyan-400/50 transition-all'

// ── Custom Checkbox ──────────────────────────────────────────────────────
function StockCheckbox({
  checked,
  indeterminate = false,
  onChange,
}: {
  checked: boolean
  indeterminate?: boolean
  onChange: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = indeterminate && !checked
    }
  }, [indeterminate, checked])

  return (
    <div
      className="relative w-5 h-5 shrink-0"
      onClick={(e) => e.stopPropagation()}
    >
      <input
        ref={inputRef}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 m-0 p-0"
      />
      <div
        className={`w-5 h-5 rounded-[5px] border-2 flex items-center justify-center pointer-events-none transition-all duration-150 ${
          checked
            ? 'bg-cyan-500 border-cyan-500'
            : indeterminate
            ? 'bg-cyan-500/20 border-cyan-400'
            : 'bg-slate-900 border-slate-600'
        }`}
      >
        {checked && (
          <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
            <path
              d="M1 4.5L3.8 7.5L10 1"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
        {!checked && indeterminate && (
          <div className="w-2.5 h-[2px] bg-cyan-300 rounded-full" />
        )}
      </div>
    </div>
  )
}

// ── Delete Modal ──────────────────────────────────────────────────────────
function DeleteModal({
  accounts,
  deleting,
  onConfirm,
  onCancel,
}: {
  accounts: AccountRow[]
  deleting: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  const count = accounts.length
  const preview = accounts.slice(0, 3)
  const overflow = count - 3
  const hasSold = accounts.some((a) => a.status === 'sold')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      {/* Invisible click-away area */}
      <div className="absolute inset-0" onClick={!deleting ? onCancel : undefined} />

      {/* Card */}
      <div className="relative w-full max-w-md rounded-2xl border border-slate-700/60 bg-[#0f172a] overflow-hidden" style={{ boxShadow: '0 24px 80px rgba(0,0,0,0.55)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-500/15 border border-red-500/20 flex items-center justify-center shrink-0">
              <Trash2 className="w-[18px] h-[18px] text-red-400" />
            </div>
            <h3 className="text-white font-semibold text-base">Xác nhận xoá tài khoản</h3>
          </div>
          {!deleting && (
            <button
              onClick={onCancel}
              className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="px-6 pb-6 space-y-4">

          {/* Warning box */}
          <div className="rounded-xl bg-red-500/8 border border-red-500/20 p-3.5 space-y-1">
            <p className="text-slate-200 text-sm leading-relaxed">
              {count === 1
                ? 'Bạn sắp xoá 1 tài khoản khỏi kho.'
                : `Bạn sắp xoá ${count} tài khoản khỏi kho.`}
            </p>
            <p className="text-slate-400 text-xs leading-relaxed">
              Hành động này không xoá thông tin đơn hàng đã giao, chỉ xoá bản ghi trong kho.
            </p>
          </div>

          {/* Account list */}
          <div>
            <p className="text-slate-400 text-xs font-medium mb-2">Danh sách tài khoản:</p>
            <div className="rounded-xl bg-white/5 border border-white/8 overflow-hidden divide-y divide-white/5">
              {preview.map((acc) => (
                <div key={acc.id} className="flex items-center gap-2 px-3 py-2">
                  <span className="text-slate-600 text-xs select-none">•</span>
                  <span className="text-slate-300 text-xs font-mono flex-1 truncate">
                    {acc.username}
                  </span>
                  {acc.status === 'sold' && (
                    <span className="text-slate-600 text-xs shrink-0">đã bán</span>
                  )}
                </div>
              ))}
              {overflow > 0 && (
                <div className="px-3 py-2">
                  <span className="text-slate-500 text-xs italic">
                    ... và {overflow} tài khoản khác
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Sold note */}
          {hasSold && (
            <div className="flex items-center gap-2 rounded-xl bg-amber-500/8 border border-amber-500/20 px-3 py-2.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <p className="text-amber-300/80 text-xs">
                Gồm tài khoản đã bán — thông tin bàn giao của đơn hàng sẽ không bị ảnh hưởng.
              </p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={onCancel}
              disabled={deleting}
              className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-300 text-sm font-medium hover:bg-white/5 transition-all disabled:opacity-40"
            >
              Huỷ
            </button>
            <button
              onClick={onConfirm}
              disabled={deleting}
              className="flex-[2] flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500/18 border border-red-500/35 text-red-300 text-sm font-semibold hover:bg-red-500/28 active:scale-[0.98] transition-all disabled:opacity-55"
            >
              {deleting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Đang xoá...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Xoá {count} tài khoản
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Toast ──────────────────────────────────────────────────────────────
function Toast({ msg, type }: { msg: string; type: 'success' | 'error' }) {
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-xl text-sm font-medium animate-in fade-in slide-in-from-bottom-2 duration-200 ${
        type === 'success'
          ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
          : 'bg-red-500/15 border-red-500/30 text-red-300'
      }`}
    >
      {type === 'success'
        ? <CheckCircle2 className="w-4 h-4 shrink-0" />
        : <AlertTriangle className="w-4 h-4 shrink-0" />}
      {msg}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────
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

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Delete modal
  const [deleteModal, setDeleteModal] = useState<AccountRow[] | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Toast
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  // Import
  const [showImport, setShowImport] = useState(false)
  const [importProduct, setImportProduct] = useState('')
  const [importPlan, setImportPlan] = useState('')
  const [importText, setImportText] = useState('')
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<string | null>(null)
  const [soldConflicts, setSoldConflicts] = useState<{ id: string; username: string; line: number; raw: string }[]>([])
  const [importErrors, setImportErrors] = useState<{ line: number; raw: string; reason: string }[]>([])

  const showToast = useCallback((msg: string, type: 'success' | 'error') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }, [])

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
        plans: (p.plans || [])
          .filter((pl) => pl.isActive !== false)
          .map((pl) => ({ id: pl.id, name: pl.name, price: pl.price })),
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
  // Clear selection whenever filter changes (reset to page 1 too)
  useEffect(() => { setPage(1); setSelectedIds(new Set()) }, [filterProduct, filterPlan, filterStatus])
  useEffect(() => { fetchAccounts() }, [fetchAccounts])

  // ── Selection helpers ──
  const allOnPageSelected = accounts.length > 0 && accounts.every((a) => selectedIds.has(a.id))
  const someOnPageSelected = accounts.some((a) => selectedIds.has(a.id))
  // Only accounts visible on this page that are selected
  const selectedOnPage = accounts.filter((a) => selectedIds.has(a.id))

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (allOnPageSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(accounts.map((a) => a.id)))
    }
  }

  // ── Delete ──
  const executeBulkDelete = async () => {
    if (!deleteModal || deleteModal.length === 0) return
    setDeleting(true)
    try {
      const ids = deleteModal.map((a) => a.id)
      const res = await fetch('/api/admin/stock/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Lỗi server')

      const count = data.deleted ?? deleteModal.length
      setDeleteModal(null)
      setSelectedIds(new Set())
      await Promise.all([fetchAccounts(), fetchStats()])
      showToast(`Đã xoá ${count} tài khoản khỏi kho`, 'success')
    } catch {
      showToast('Không thể xoá tài khoản. Vui lòng thử lại.', 'error')
    } finally {
      setDeleting(false)
    }
  }

  // ── Import ──
  const selectedProductPlans = products.find((p) => p.id === filterProduct)?.plans || []
  const importPlans = products.find((p) => p.id === importProduct)?.plans || []

  const doImport = async (overwriteSold: boolean) => {
    if (!importProduct || !importPlan || !importText.trim()) return
    setImporting(true)
    setImportResult(null)
    setImportErrors([])
    setSoldConflicts([])
    try {
      const lines = importText.split('\n').filter((l) => l.trim().length > 0)
      const res = await fetch('/api/admin/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: importProduct, planId: importPlan, lines, overwriteSold }),
      })
      const data = await res.json()

      if (data.success) {
        if (data.requiresConfirm && data.soldConflicts?.length > 0) {
          setSoldConflicts(data.soldConflicts)
          const newMsg = data.imported > 0 ? `✅ Đã nạp ${data.imported} tài khoản mới.` : null
          setImportResult(newMsg)
          if (data.errors?.length > 0) setImportErrors(data.errors)
          if (data.imported > 0) { fetchStats(); fetchAccounts() }
          return
        }
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

  const handleImport = () => doImport(false)
  const handleOverwriteSold = () => doImport(true)

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

  const totalAvailable = stats.reduce((s, p) => s + p.totalAvailable, 0)
  const totalSold = stats.flatMap((p) => p.plans).reduce((s, pl) => s + pl.sold, 0)

  return (
    <>
      <AdminHeader title="Kho tài khoản" adminEmail="admin@longshop.net" />
      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-7xl mx-auto space-y-5">

          {/* Stats */}
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

          {/* Per-product overview */}
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

          {/* Import */}
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
                        <option key={p.id} value={p.id} className="bg-[#0f172a]">{p.icon} {p.name}</option>
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
                      Mỗi dòng:{' '}
                      <code className="bg-white/5 px-1 rounded">username|password</code> hoặc{' '}
                      <code className="bg-white/5 px-1 rounded">username|password|ghi chú</code>
                    </span>
                  </label>
                  <textarea
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    rows={8}
                    placeholder={`user1@example.com|Pass123\nuser2@example.com|Pass456|Hạn 1 tháng`}
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

                {soldConflicts.length > 0 && (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-amber-300 text-sm font-semibold">
                          {soldConflicts.length} tài khoản trùng với bản ghi đã bán
                        </p>
                        <p className="text-amber-400/80 text-xs mt-1">
                          Xóa các bản ghi đã bán để nhập lại vào kho không? Thông tin bàn giao không bị ảnh hưởng.
                        </p>
                      </div>
                    </div>
                    <div className="space-y-1 pl-6">
                      {soldConflicts.map((c, i) => (
                        <p key={i} className="text-xs font-mono text-slate-400">
                          <span className="text-slate-500">Dòng {c.line}:</span> {c.username}
                        </p>
                      ))}
                    </div>
                    <div className="flex gap-2 pl-6">
                      <button
                        onClick={handleOverwriteSold}
                        disabled={importing}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-medium hover:bg-amber-500/30 transition-all disabled:opacity-50"
                      >
                        {importing ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                        Xóa bản ghi đã bán và nhập lại
                      </button>
                      <button
                        onClick={() => setSoldConflicts([])}
                        className="px-3 py-1.5 rounded-lg border border-white/10 text-slate-400 text-xs hover:text-white transition-all"
                      >
                        Bỏ qua
                      </button>
                    </div>
                  </div>
                )}

                {importErrors.length > 0 && (
                  <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-3 space-y-1">
                    <p className="text-orange-400 text-xs font-semibold mb-2">
                      {importErrors.length} dòng bị bỏ qua:
                    </p>
                    {importErrors.map((e, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs">
                        {e.line > 0 && <span className="text-slate-500 shrink-0 font-mono">Dòng {e.line}:</span>}
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

          {/* Account list */}
          <div className="glass rounded-2xl border border-white/10 overflow-hidden">

            {/* Filters */}
            <div className="px-6 py-4 border-b border-white/10 space-y-3">
              <p className="text-white font-semibold text-sm">Danh sách tài khoản trong kho</p>
              <div className="grid sm:grid-cols-3 gap-3">
                <select
                  value={filterProduct}
                  onChange={(e) => { setFilterProduct(e.target.value); setFilterPlan('') }}
                  className={inp}
                >
                  <option value="">Tất cả sản phẩm</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id} className="bg-[#0f172a]">{p.icon} {p.name}</option>
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

              {/* Bulk action bar — only when something is selected */}
              {selectedOnPage.length > 0 && (
                <div className="flex items-center justify-between gap-3 rounded-xl bg-[#0f2035] border border-cyan-500/25 px-4 py-3">
                  <span className="text-cyan-300 text-sm font-medium">
                    Đã chọn <span className="font-bold">{selectedOnPage.length}</span> tài khoản
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedIds(new Set())}
                      className="px-3 py-1.5 rounded-lg border border-white/10 text-slate-400 text-xs font-medium hover:text-white hover:bg-white/5 transition-all"
                    >
                      Bỏ chọn
                    </button>
                    <button
                      onClick={() => setDeleteModal(selectedOnPage)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/18 border border-red-500/30 text-red-300 text-xs font-semibold hover:bg-red-500/28 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Xoá đã chọn
                    </button>
                  </div>
                </div>
              )}
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
                {/* Select-all row */}
                <div className="flex items-center gap-3.5 px-5 py-2.5 bg-white/[0.02] border-b border-white/5">
                  <StockCheckbox
                    checked={allOnPageSelected}
                    indeterminate={someOnPageSelected && !allOnPageSelected}
                    onChange={toggleAll}
                  />
                  <span className="text-slate-500 text-xs">
                    Chọn tất cả tài khoản đang hiển thị
                    <span className="ml-1.5 text-slate-600">({accounts.length})</span>
                  </span>
                </div>

                {/* Account rows */}
                <div className="divide-y divide-white/5">
                  {accounts.map((acc) => {
                    const st = STATUS_LABEL[acc.status] || STATUS_LABEL.available
                    const isSelected = selectedIds.has(acc.id)
                    return (
                      <div
                        key={acc.id}
                        className={`flex items-center gap-3.5 px-5 py-3.5 transition-colors ${
                          isSelected ? 'bg-cyan-500/5' : 'hover:bg-white/[0.02]'
                        }`}
                      >
                        {/* Checkbox */}
                        <StockCheckbox
                          checked={isSelected}
                          onChange={() => toggleOne(acc.id)}
                        />

                        {/* Status dot */}
                        <div
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            acc.status === 'available' ? 'bg-emerald-400' :
                            acc.status === 'sold' ? 'bg-slate-500' : 'bg-orange-400'
                          }`}
                        />

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

                        {/* Status badge + order */}
                        <div className="text-right hidden sm:block shrink-0">
                          <span className={`text-xs font-medium ${st.color}`}>{st.label}</span>
                          {acc.order && (
                            <p className="text-slate-600 text-xs mt-0.5 font-mono">{acc.order.orderCode}</p>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-0.5 shrink-0">
                          {acc.status !== 'sold' && (
                            <>
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
                                onClick={() => setDeleteModal([acc])}
                                className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-all"
                                title="Xoá"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          {acc.status === 'sold' && (
                            <button
                              onClick={() => setDeleteModal([acc])}
                              className="p-2 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                              title="Xoá bản ghi đã bán (chỉ dùng để nhập lại/test)"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
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

      {/* Delete modal */}
      {deleteModal && (
        <DeleteModal
          accounts={deleteModal}
          deleting={deleting}
          onConfirm={executeBulkDelete}
          onCancel={() => { if (!deleting) setDeleteModal(null) }}
        />
      )}

      {/* Toast */}
      {toast && <Toast msg={toast.msg} type={toast.type} />}
    </>
  )
}
