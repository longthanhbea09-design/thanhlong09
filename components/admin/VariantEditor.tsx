'use client'

import { useState, useCallback } from 'react'
import {
  Loader2, Save, Trash2, Plus, ToggleLeft, ToggleRight,
  Copy, ChevronDown, ChevronUp, AlertTriangle,
} from 'lucide-react'
import { formatPrice } from '@/lib/utils'

interface Variant {
  id: string
  name: string
  duration: string
  type: string
  price: number
  warrantyText: string
  description: string | null   // "Chú thích gói"
  badge: string | null         // "Nhãn gói"
  available: boolean
  isActive: boolean
  sortOrder: number
}

interface Props {
  productId: string
  initialVariants: Variant[]
  onVariantsChange?: (variants: Variant[]) => void
}

const inp = 'px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-400/50 w-full transition-colors placeholder-slate-600'
const lbl = 'block text-slate-400 text-xs font-medium mb-1'
const hint = 'text-slate-600 text-[11px] mt-1'

function hasConflict(warrantyText: string, description: string | null): boolean {
  const isKBH = /\bkbh\b/i.test(warrantyText.trim())
  const descHasBH = /bảo\s*hành|bhf|bh\s+full/i.test(description || '')
  return isKBH && descHasBH
}

const DEFAULT_NEW: Omit<Variant, 'id'> = {
  name: '',
  duration: '1 tháng',
  type: '',
  price: 0,
  warrantyText: 'KBH',
  description: '',
  badge: null,
  available: true,
  isActive: true,
  sortOrder: 99,
}

export default function VariantEditor({ productId, initialVariants, onVariantsChange }: Props) {
  const [variants, setVariants] = useState<Variant[]>(initialVariants)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [edits, setEdits] = useState<Record<string, Partial<Variant>>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [addingNew, setAddingNew] = useState(false)
  const [newVariant, setNewVariant] = useState<Omit<Variant, 'id'>>(DEFAULT_NEW)
  const [savingNew, setSavingNew] = useState(false)

  const sync = useCallback((list: Variant[]) => {
    setVariants(list)
    onVariantsChange?.(list)
  }, [onVariantsChange])

  const patch = (id: string, field: keyof Variant, value: unknown) =>
    setEdits(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }))

  const current = (v: Variant): Variant => ({ ...v, ...edits[v.id] })
  const isDirty = (id: string) => !!(edits[id] && Object.keys(edits[id]).length > 0)

  const saveVariant = async (v: Variant) => {
    const changes = edits[v.id]
    if (!changes || !Object.keys(changes).length) return
    setSaving(v.id)
    try {
      const res = await fetch(`/api/admin/variants/${v.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changes),
      })
      if (res.ok) {
        const updated = await res.json()
        sync(variants.map(x => x.id === v.id ? updated : x))
        setEdits(prev => { const n = { ...prev }; delete n[v.id]; return n })
      }
    } finally { setSaving(null) }
  }

  const toggleAvailable = async (v: Variant) => {
    setSaving(v.id)
    try {
      const res = await fetch(`/api/admin/variants/${v.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ available: !v.available }),
      })
      if (res.ok) sync(variants.map(x => x.id === v.id ? { ...x, available: !v.available } : x))
    } finally { setSaving(null) }
  }

  const deleteVariant = async (id: string) => {
    if (!confirm('Xóa gói này? Không thể hoàn tác.')) return
    setSaving(id)
    try {
      const res = await fetch(`/api/admin/variants/${id}`, { method: 'DELETE' })
      if (res.ok) { sync(variants.filter(x => x.id !== id)); setExpandedId(null) }
    } finally { setSaving(null) }
  }

  const duplicateVariant = async (v: Variant) => {
    setSaving(v.id)
    try {
      const c = current(v)
      const res = await fetch(`/api/admin/products/${productId}/variants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${c.name} (Copy)`,
          duration: c.duration,
          type: c.type,
          price: c.price,
          warrantyText: c.warrantyText,
          description: c.description || '',
          badge: c.badge,
          available: false,
          sortOrder: c.sortOrder + 1,
        }),
      })
      if (res.ok) {
        const created = await res.json()
        sync([...variants, created])
        setExpandedId(created.id)
      }
    } finally { setSaving(null) }
  }

  const addVariant = async () => {
    if (!newVariant.name.trim()) return
    setSavingNew(true)
    try {
      const res = await fetch(`/api/admin/products/${productId}/variants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newVariant, price: Number(newVariant.price) }),
      })
      if (res.ok) {
        const created = await res.json()
        sync([...variants, created])
        setNewVariant(DEFAULT_NEW)
        setAddingNew(false)
        setExpandedId(created.id)
      }
    } finally { setSavingNew(false) }
  }

  const activeVariants = variants
    .filter(v => v.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder)

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white text-sm font-semibold">Gói bán ({activeVariants.length})</p>
          <p className="text-slate-500 text-xs">Mỗi gói là một lựa chọn mua hàng cho khách</p>
        </div>
        <button
          onClick={() => { setAddingNew(true); setExpandedId(null) }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-medium hover:bg-cyan-500/20 transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          Thêm gói
        </button>
      </div>

      {/* Variant accordion */}
      <div className="space-y-2">
        {activeVariants.map(v => {
          const c = current(v)
          const isExpanded = expandedId === v.id
          const dirty = isDirty(v.id)
          const isSaving = saving === v.id
          const conflict = hasConflict(c.warrantyText, c.description)

          return (
            <div
              key={v.id}
              className={`rounded-xl border overflow-hidden transition-all ${
                isExpanded
                  ? 'border-cyan-500/30 bg-white/[0.02]'
                  : c.available
                  ? 'border-white/10 hover:border-white/20'
                  : 'border-orange-500/20'
              }`}
            >
              {/* Collapsed header — click to expand */}
              <button
                className="w-full flex items-center gap-3 px-4 py-3 text-left"
                onClick={() => setExpandedId(isExpanded ? null : v.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white text-sm font-medium truncate">{c.name || 'Tên gói'}</span>
                    {c.badge && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 border border-cyan-500/30 text-cyan-300">
                        {c.badge}
                      </span>
                    )}
                    {conflict && (
                      <span title="Mâu thuẫn KBH / Bảo hành">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                      </span>
                    )}
                    {dirty && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" title="Chưa lưu" />}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-emerald-400 text-xs font-semibold">{formatPrice(c.price)}</span>
                    <span className="text-slate-600 text-xs">·</span>
                    <span className="text-slate-400 text-xs">{c.warrantyText}</span>
                    {c.description && (
                      <>
                        <span className="text-slate-700 text-xs">·</span>
                        <span className="text-slate-500 text-xs truncate max-w-[160px]">{c.description}</span>
                      </>
                    )}
                  </div>
                </div>
                <span className={`text-[10px] font-semibold shrink-0 ${c.available ? 'text-emerald-400' : 'text-orange-400'}`}>
                  {c.available ? '● Còn' : '● Hết'}
                </span>
                {isExpanded
                  ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                  : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                }
              </button>

              {/* Expanded edit form */}
              {isExpanded && (
                <div className="border-t border-white/8 px-4 pb-4 pt-4 space-y-4">
                  {/* Conflict warning */}
                  {conflict && (
                    <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-amber-300 text-xs font-semibold">Mâu thuẫn dữ liệu</p>
                        <p className="text-amber-400/80 text-xs mt-0.5">
                          Bảo hành là <strong>KBH</strong> nhưng chú thích đang ghi "Bảo hành". Hãy sửa một trong hai để tránh khách hàng hiểu nhầm.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Row 1: Tên | Giá | Thời hạn */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className={lbl}>Tên gói *</label>
                      <input
                        value={c.name}
                        onChange={e => patch(v.id, 'name', e.target.value)}
                        placeholder="VD: 35D RENEW"
                        className={inp}
                      />
                    </div>
                    <div>
                      <label className={lbl}>Giá bán (VNĐ)</label>
                      <input
                        type="number"
                        value={c.price}
                        onChange={e => patch(v.id, 'price', Number(e.target.value))}
                        className={inp}
                      />
                    </div>
                    <div>
                      <label className={lbl}>Thời hạn</label>
                      <input
                        value={c.duration}
                        onChange={e => patch(v.id, 'duration', e.target.value)}
                        placeholder="1 tháng"
                        className={inp}
                      />
                    </div>
                  </div>

                  {/* Row 2: Bảo hành | Nhãn gói | Thứ tự */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className={lbl}>Bảo hành</label>
                      <input
                        value={c.warrantyText}
                        onChange={e => patch(v.id, 'warrantyText', e.target.value)}
                        placeholder="KBH / BH 7 ngày / BHF"
                        className={inp}
                      />
                      <p className={hint}>VD: KBH, BH 7 ngày, BHF</p>
                    </div>
                    <div>
                      <label className={lbl}>Nhãn gói</label>
                      <input
                        value={c.badge ?? ''}
                        onChange={e => patch(v.id, 'badge', e.target.value || null)}
                        placeholder="Phổ biến, Tiết kiệm..."
                        className={inp}
                      />
                      <p className={hint}>Hiển thị nổi bật trên thẻ gói</p>
                    </div>
                    <div>
                      <label className={lbl}>Thứ tự</label>
                      <input
                        type="number"
                        value={c.sortOrder}
                        onChange={e => patch(v.id, 'sortOrder', Number(e.target.value))}
                        className={inp}
                      />
                    </div>
                  </div>

                  {/* Row 3: Chú thích gói */}
                  <div>
                    <label className={lbl}>Chú thích gói</label>
                    <input
                      value={c.description ?? ''}
                      onChange={e => patch(v.id, 'description', e.target.value)}
                      placeholder="VD: Tài khoản riêng, dùng ổn định"
                      className={inp}
                    />
                    <p className={hint}>
                      Hiển thị dưới dòng bảo hành. Không nên nhắc "Bảo hành" nếu đã chọn KBH.
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-white/5">
                    {/* Còn hàng toggle */}
                    <button
                      onClick={() => toggleAvailable(v)}
                      disabled={isSaving}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-xs text-slate-300 hover:border-white/20 transition-all"
                    >
                      {v.available
                        ? <><ToggleRight className="w-5 h-5 text-emerald-400" /><span>Còn hàng</span></>
                        : <><ToggleLeft className="w-5 h-5 text-slate-500" /><span>Hết hàng</span></>
                      }
                    </button>

                    <div className="flex gap-2 ml-auto">
                      {/* Nhân bản */}
                      <button
                        onClick={() => duplicateVariant(v)}
                        disabled={isSaving}
                        title="Nhân bản gói này"
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 text-xs hover:text-white hover:bg-white/10 transition-all"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        Nhân bản
                      </button>

                      {/* Lưu */}
                      <button
                        onClick={() => saveVariant(v)}
                        disabled={!dirty || isSaving}
                        className={`flex items-center gap-1 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          dirty
                            ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30'
                            : 'bg-white/5 border border-white/10 text-slate-600 cursor-not-allowed'
                        }`}
                      >
                        {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        {dirty ? 'Lưu' : 'Đã lưu'}
                      </button>

                      {/* Xóa */}
                      <button
                        onClick={() => deleteVariant(v.id)}
                        disabled={isSaving}
                        title="Xóa gói"
                        className="p-1.5 rounded-lg text-red-400/50 hover:text-red-400 hover:bg-red-500/10 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Add new variant form */}
      {addingNew && (
        <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/[0.03] p-4 space-y-4">
          <p className="text-cyan-400 text-sm font-semibold">Gói mới</p>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={lbl}>Tên gói *</label>
              <input
                value={newVariant.name}
                onChange={e => setNewVariant(n => ({ ...n, name: e.target.value }))}
                placeholder="VD: 35D RENEW"
                className={inp}
                autoFocus
              />
            </div>
            <div>
              <label className={lbl}>Giá bán (VNĐ)</label>
              <input
                type="number"
                value={newVariant.price || ''}
                onChange={e => setNewVariant(n => ({ ...n, price: Number(e.target.value) }))}
                placeholder="99000"
                className={inp}
              />
            </div>
            <div>
              <label className={lbl}>Thời hạn</label>
              <input
                value={newVariant.duration}
                onChange={e => setNewVariant(n => ({ ...n, duration: e.target.value }))}
                className={inp}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={lbl}>Bảo hành</label>
              <input
                value={newVariant.warrantyText}
                onChange={e => setNewVariant(n => ({ ...n, warrantyText: e.target.value }))}
                placeholder="KBH / BH 7 ngày / BHF"
                className={inp}
              />
              <p className={hint}>VD: KBH, BH 7 ngày, BHF</p>
            </div>
            <div>
              <label className={lbl}>Nhãn gói</label>
              <input
                value={newVariant.badge ?? ''}
                onChange={e => setNewVariant(n => ({ ...n, badge: e.target.value || null }))}
                placeholder="Phổ biến"
                className={inp}
              />
            </div>
            <div>
              <label className={lbl}>Thứ tự</label>
              <input
                type="number"
                value={newVariant.sortOrder}
                onChange={e => setNewVariant(n => ({ ...n, sortOrder: Number(e.target.value) }))}
                className={inp}
              />
            </div>
          </div>

          <div>
            <label className={lbl}>Chú thích gói</label>
            <input
              value={newVariant.description ?? ''}
              onChange={e => setNewVariant(n => ({ ...n, description: e.target.value }))}
              placeholder="VD: Tài khoản riêng, dùng ổn định"
              className={inp}
            />
          </div>

          {hasConflict(newVariant.warrantyText, newVariant.description) && (
            <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-amber-300 text-xs">
                Bảo hành là <strong>KBH</strong> nhưng chú thích đang ghi "Bảo hành". Hãy sửa một trong hai.
              </p>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={addVariant}
              disabled={savingNew || !newVariant.name.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-emerald-500 text-white text-xs font-semibold disabled:opacity-50 transition-all"
            >
              {savingNew ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
              Thêm gói
            </button>
            <button
              onClick={() => { setAddingNew(false); setNewVariant(DEFAULT_NEW) }}
              className="px-4 py-2 rounded-lg border border-white/10 text-slate-400 text-xs hover:text-white transition-all"
            >
              Hủy
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
