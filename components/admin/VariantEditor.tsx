'use client'

import { useState } from 'react'
import { Loader2, Save, Trash2, Plus, ToggleLeft, ToggleRight } from 'lucide-react'
import { formatPrice } from '@/lib/utils'

interface Variant {
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

interface Props {
  productId: string
  initialVariants: Variant[]
}

const inp = 'px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-400/50 w-full transition-colors'

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

export default function VariantEditor({ productId, initialVariants }: Props) {
  const [variants, setVariants] = useState<Variant[]>(initialVariants)
  const [edits, setEdits] = useState<Record<string, Partial<Variant>>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [addingNew, setAddingNew] = useState(false)
  const [newVariant, setNewVariant] = useState<Omit<Variant, 'id'>>(DEFAULT_NEW)
  const [savingNew, setSavingNew] = useState(false)

  const patch = (id: string, field: keyof Variant, value: unknown) =>
    setEdits((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }))

  const current = (v: Variant) => ({ ...v, ...edits[v.id] })
  const isDirty = (id: string) => edits[id] && Object.keys(edits[id]).length > 0

  const saveVariant = async (v: Variant) => {
    const changes = edits[v.id]
    if (!changes || Object.keys(changes).length === 0) return
    setSaving(v.id)
    try {
      const res = await fetch(`/api/admin/variants/${v.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changes),
      })
      if (res.ok) {
        const updated = await res.json()
        setVariants((prev) => prev.map((x) => (x.id === v.id ? updated : x)))
        setEdits((prev) => { const n = { ...prev }; delete n[v.id]; return n })
      }
    } finally {
      setSaving(null)
    }
  }

  const toggleAvailable = async (v: Variant) => {
    setSaving(v.id)
    try {
      const res = await fetch(`/api/admin/variants/${v.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ available: !v.available }),
      })
      if (res.ok) {
        const updated = await res.json()
        setVariants((prev) => prev.map((x) => (x.id === v.id ? updated : x)))
      }
    } finally {
      setSaving(null)
    }
  }

  const deleteVariant = async (id: string) => {
    if (!confirm('Xóa option này?')) return
    setSaving(id)
    try {
      const res = await fetch(`/api/admin/variants/${id}`, { method: 'DELETE' })
      if (res.ok) setVariants((prev) => prev.filter((x) => x.id !== id))
    } finally {
      setSaving(null)
    }
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
        setVariants((prev) => [...prev, created])
        setNewVariant(DEFAULT_NEW)
        setAddingNew(false)
      }
    } finally {
      setSavingNew(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-slate-300 text-sm font-semibold">
          Gói / Option ({variants.filter(v => v.isActive).length})
        </p>
        <button
          onClick={() => setAddingNew(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-medium hover:bg-cyan-500/20 transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          Thêm option
        </button>
      </div>

      {/* Existing variants */}
      <div className="space-y-2">
        {variants.filter(v => v.isActive).map((v) => {
          const c = current(v)
          const dirty = isDirty(v.id)
          const isSaving = saving === v.id

          return (
            <div
              key={v.id}
              className={`rounded-xl border p-3 transition-all ${
                c.available
                  ? 'border-white/10 bg-white/[0.02]'
                  : 'border-orange-500/20 bg-orange-500/[0.03]'
              }`}
            >
              {/* Row 1: name + price + sortOrder + actions */}
              <div className="flex flex-wrap gap-2 items-end">
                <div className="flex-1 min-w-[130px]">
                  <p className="text-slate-500 text-[10px] mb-1">Tên option</p>
                  <input
                    value={c.name}
                    onChange={(e) => patch(v.id, 'name', e.target.value)}
                    className={inp}
                  />
                </div>
                <div className="w-32">
                  <p className="text-slate-500 text-[10px] mb-1">Giá (VNĐ)</p>
                  <input
                    type="number"
                    value={c.price}
                    onChange={(e) => patch(v.id, 'price', Number(e.target.value))}
                    className={inp}
                  />
                </div>
                <div className="w-20">
                  <p className="text-slate-500 text-[10px] mb-1">Thời hạn</p>
                  <input
                    value={c.duration}
                    onChange={(e) => patch(v.id, 'duration', e.target.value)}
                    className={inp}
                  />
                </div>
                <div className="w-14">
                  <p className="text-slate-500 text-[10px] mb-1">Thứ tự</p>
                  <input
                    type="number"
                    value={c.sortOrder}
                    onChange={(e) => patch(v.id, 'sortOrder', Number(e.target.value))}
                    className={inp}
                  />
                </div>
                {/* Available toggle */}
                <button
                  onClick={() => toggleAvailable(v)}
                  disabled={isSaving}
                  title={v.available ? 'Đang có sẵn — click để tắt' : 'Đang hết hàng — click để bật'}
                  className="flex flex-col items-center gap-1 px-2 py-1 rounded-lg hover:bg-white/5 transition-all"
                >
                  <p className="text-slate-500 text-[10px]">Có sẵn</p>
                  {v.available
                    ? <ToggleRight className="w-6 h-6 text-emerald-400" />
                    : <ToggleLeft className="w-6 h-6 text-slate-500" />
                  }
                </button>
                {/* Save */}
                <button
                  onClick={() => saveVariant(v)}
                  disabled={!dirty || isSaving}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    dirty
                      ? 'bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/30'
                      : 'bg-white/5 border border-white/10 text-slate-600 cursor-not-allowed'
                  }`}
                >
                  {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                  {dirty ? 'Lưu' : 'Đã lưu'}
                </button>
                {/* Delete */}
                <button
                  onClick={() => deleteVariant(v.id)}
                  disabled={isSaving}
                  className="p-1.5 rounded-lg text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Row 2: warranty + note + badge + price display */}
              <div className="flex gap-2 mt-2 items-center">
                <div className="w-28 shrink-0">
                  <p className="text-slate-500 text-[10px] mb-1">Bảo hành</p>
                  <input
                    value={c.warrantyText}
                    onChange={(e) => patch(v.id, 'warrantyText', e.target.value)}
                    placeholder="KBH / BH 1 tháng..."
                    className={`${inp} text-slate-300 text-xs`}
                  />
                </div>
                <input
                  value={c.description ?? ''}
                  onChange={(e) => patch(v.id, 'description', e.target.value)}
                  placeholder="Mô tả hiển thị cho khách..."
                  className={`${inp} text-slate-400 text-xs flex-1`}
                />
                <input
                  value={c.badge ?? ''}
                  onChange={(e) => patch(v.id, 'badge', e.target.value || null)}
                  placeholder="Badge (VD: Phổ biến)"
                  className={`${inp} text-slate-400 text-xs w-32`}
                />
                <span className={`text-xs font-semibold shrink-0 ${c.available ? 'text-emerald-400' : 'text-orange-400'}`}>
                  {c.available ? '● Còn hàng' : '● Hết hàng'}
                </span>
                <span className="text-cyan-300 text-xs font-bold shrink-0">{formatPrice(c.price)}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Add new variant form */}
      {addingNew && (
        <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-3 space-y-2">
          <p className="text-cyan-400 text-xs font-semibold">Option mới</p>
          <div className="flex flex-wrap gap-2">
            <div className="flex-1 min-w-[130px]">
              <p className="text-slate-500 text-[10px] mb-1">Tên option *</p>
              <input
                value={newVariant.name}
                onChange={(e) => setNewVariant((n) => ({ ...n, name: e.target.value }))}
                placeholder="VD: 1 tháng VIP"
                className={inp}
              />
            </div>
            <div className="w-32">
              <p className="text-slate-500 text-[10px] mb-1">Giá (VNĐ) *</p>
              <input
                type="number"
                value={newVariant.price || ''}
                onChange={(e) => setNewVariant((n) => ({ ...n, price: Number(e.target.value) }))}
                placeholder="99000"
                className={inp}
              />
            </div>
            <div className="w-24">
              <p className="text-slate-500 text-[10px] mb-1">Thời hạn</p>
              <input
                value={newVariant.duration}
                onChange={(e) => setNewVariant((n) => ({ ...n, duration: e.target.value }))}
                className={inp}
              />
            </div>
            <div className="w-28">
              <p className="text-slate-500 text-[10px] mb-1">Bảo hành</p>
              <input
                value={newVariant.warrantyText}
                onChange={(e) => setNewVariant((n) => ({ ...n, warrantyText: e.target.value }))}
                placeholder="KBH / BH 1 tháng"
                className={inp}
              />
            </div>
            <div className="w-28">
              <p className="text-slate-500 text-[10px] mb-1">Badge</p>
              <input
                value={newVariant.badge ?? ''}
                onChange={(e) => setNewVariant((n) => ({ ...n, badge: e.target.value || null }))}
                placeholder="VD: Phổ biến"
                className={inp}
              />
            </div>
          </div>
          <input
            value={newVariant.description ?? ''}
            onChange={(e) => setNewVariant((n) => ({ ...n, description: e.target.value }))}
            placeholder="Mô tả hiển thị cho khách..."
            className={`${inp} text-xs`}
          />
          <div className="flex gap-2 pt-1">
            <button
              onClick={addVariant}
              disabled={savingNew || !newVariant.name.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-emerald-500 text-white text-xs font-semibold disabled:opacity-50 transition-all"
            >
              {savingNew ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
              Thêm
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
