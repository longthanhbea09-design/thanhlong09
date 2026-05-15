'use client'

import { useEffect, useState, useRef } from 'react'
import {
  Plus, Trash2, Save, X, Upload, Loader2, ToggleLeft, ToggleRight,
  ChevronDown, Wallet, Image as ImageIcon, Pencil,
} from 'lucide-react'
import { EWALLET_PROVIDERS, EWALLET_PROVIDER_LABELS, type EwalletProvider } from '@/lib/validators'

interface PaymentMethod {
  id: string
  type: string
  provider: string
  name: string
  accountNo: string | null
  accountName: string | null
  phone: string | null
  qrImage: string | null
  paymentUrl: string | null
  transferNote: string | null
  note: string | null
  enabled: boolean
  sortOrder: number
}

const BLANK_FORM = {
  provider: 'MOMO' as EwalletProvider,
  name: '',
  accountNo: '',
  accountName: '',
  phone: '',
  qrImage: '',
  paymentUrl: '',
  transferNote: '{{orderCode}}',
  note: 'Vui lòng chuyển đúng nội dung để hệ thống xác nhận đơn hàng.',
  enabled: true,
  sortOrder: 0,
}

type FormState = typeof BLANK_FORM

export default function EwalletSection() {
  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(BLANK_FORM)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const qrFileRef = useRef<HTMLInputElement>(null)

  const inp = 'w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-400/50 transition-all'
  const lbl = 'block text-slate-300 text-xs font-medium mb-1.5'

  async function fetchMethods() {
    try {
      const res = await fetch('/api/admin/payment-methods')
      if (res.ok) setMethods(await res.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchMethods() }, [])

  function startAdd() {
    setEditingId(null)
    setForm({ ...BLANK_FORM, name: EWALLET_PROVIDER_LABELS['MOMO'] })
    setShowAddForm(true)
    setError(null)
  }

  function startEdit(m: PaymentMethod) {
    setShowAddForm(false)
    setEditingId(m.id)
    setForm({
      provider: (m.provider as EwalletProvider) ?? 'OTHER',
      name: m.name,
      accountNo: m.accountNo ?? '',
      accountName: m.accountName ?? '',
      phone: m.phone ?? '',
      qrImage: m.qrImage ?? '',
      paymentUrl: m.paymentUrl ?? '',
      transferNote: m.transferNote ?? '{{orderCode}}',
      note: m.note ?? '',
      enabled: m.enabled,
      sortOrder: m.sortOrder,
    })
    setError(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setShowAddForm(false)
    setError(null)
  }

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function uploadQr(file: File, targetId: string | 'new') {
    setUploadingId(targetId)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })
      const json = await res.json()
      if (res.ok) {
        setField('qrImage', json.url)
      } else {
        setError(json.error || 'Lỗi upload ảnh QR')
      }
    } catch {
      setError('Không thể upload ảnh QR')
    } finally {
      setUploadingId(null)
      if (qrFileRef.current) qrFileRef.current.value = ''
    }
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('Vui lòng nhập tên ví'); return }
    setSaving(true)
    setError(null)
    try {
      const payload = {
        type: 'EWALLET',
        provider: form.provider,
        name: form.name.trim(),
        accountNo: form.accountNo.trim() || null,
        accountName: form.accountName.trim() || null,
        phone: form.phone.trim() || null,
        qrImage: form.qrImage.trim() || null,
        paymentUrl: form.paymentUrl.trim() || null,
        transferNote: form.transferNote.trim() || null,
        note: form.note.trim() || null,
        enabled: form.enabled,
        sortOrder: form.sortOrder,
      }

      const url = editingId
        ? `/api/admin/payment-methods/${editingId}`
        : '/api/admin/payment-methods'
      const method = editingId ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const json = await res.json()
        setError(json.error || 'Lỗi khi lưu')
        return
      }
      await fetchMethods()
      cancelEdit()
    } finally {
      setSaving(false)
    }
  }

  async function toggleEnabled(m: PaymentMethod) {
    try {
      await fetch(`/api/admin/payment-methods/${m.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !m.enabled }),
      })
      await fetchMethods()
    } catch { /* ignore */ }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      await fetch(`/api/admin/payment-methods/${id}`, { method: 'DELETE' })
      await fetchMethods()
    } finally {
      setDeletingId(null)
    }
  }

  const ProviderIcon = ({ provider }: { provider: string }) => {
    const icons: Record<string, string> = {
      MOMO: '💜',
      ZALOPAY: '🔵',
      VIETTELMONEY: '🔴',
      SHOPEEPAY: '🟠',
      OTHER: '💳',
    }
    return <span>{icons[provider] ?? '💳'}</span>
  }

  function renderForm(targetId: string | 'new') {
    const isUploading = uploadingId === targetId
    return (
      <div className="border border-cyan-500/20 rounded-xl p-5 bg-white/[0.02] space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          {/* Provider */}
          <div>
            <label className={lbl}>Loại ví</label>
            <select
              value={form.provider}
              onChange={(e) => {
                const p = e.target.value as EwalletProvider
                setField('provider', p)
                if (!form.name || EWALLET_PROVIDERS.some(pr => EWALLET_PROVIDER_LABELS[pr] === form.name)) {
                  setField('name', EWALLET_PROVIDER_LABELS[p] ?? '')
                }
              }}
              className={`${inp} cursor-pointer`}
            >
              {EWALLET_PROVIDERS.map((p) => (
                <option key={p} value={p} className="bg-[#0f172a]">
                  {EWALLET_PROVIDER_LABELS[p]}
                </option>
              ))}
            </select>
          </div>

          {/* Name */}
          <div>
            <label className={lbl}>Tên hiển thị</label>
            <input
              value={form.name}
              onChange={(e) => setField('name', e.target.value)}
              className={inp}
              placeholder="MoMo - Nguyễn Thành Long"
            />
          </div>

          {/* Phone */}
          <div>
            <label className={lbl}>Số điện thoại / Số tài khoản ví</label>
            <input
              value={form.accountNo ?? ''}
              onChange={(e) => { setField('accountNo', e.target.value); setField('phone', e.target.value) }}
              className={inp}
              placeholder="0830812200"
            />
          </div>

          {/* Account name */}
          <div>
            <label className={lbl}>Tên chủ ví</label>
            <input
              value={form.accountName ?? ''}
              onChange={(e) => setField('accountName', e.target.value)}
              className={inp}
              placeholder="NGUYEN CONG THANH LONG"
            />
          </div>

          {/* Transfer note */}
          <div>
            <label className={lbl}>Nội dung chuyển khoản mặc định</label>
            <input
              value={form.transferNote ?? ''}
              onChange={(e) => setField('transferNote', e.target.value)}
              className={inp}
              placeholder="{{orderCode}}"
            />
            <p className="text-slate-500 text-xs mt-1">
              Dùng <span className="text-cyan-400 font-mono">{'{{orderCode}}'}</span> để tự động điền mã đơn
            </p>
          </div>

          {/* Payment URL */}
          <div>
            <label className={lbl}>Link thanh toán (nếu có)</label>
            <input
              value={form.paymentUrl ?? ''}
              onChange={(e) => setField('paymentUrl', e.target.value)}
              className={inp}
              placeholder="https://me.momo.vn/..."
            />
          </div>
        </div>

        {/* Note */}
        <div>
          <label className={lbl}>Ghi chú hiển thị cho khách</label>
          <textarea
            value={form.note ?? ''}
            onChange={(e) => setField('note', e.target.value)}
            rows={2}
            className={`${inp} resize-none`}
            placeholder="Vui lòng chuyển đúng nội dung để hệ thống xác nhận đơn hàng."
          />
        </div>

        {/* QR Upload */}
        <div>
          <label className={lbl}>Ảnh QR thanh toán</label>
          <div className="flex gap-2">
            <input
              value={form.qrImage ?? ''}
              onChange={(e) => setField('qrImage', e.target.value)}
              className={`${inp} flex-1`}
              placeholder="https://... hoặc upload file"
            />
            <button
              type="button"
              onClick={() => qrFileRef.current?.click()}
              disabled={isUploading}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-white/20 text-slate-300 hover:text-white hover:border-white/40 hover:bg-white/5 transition-all text-sm shrink-0 disabled:opacity-50"
            >
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {isUploading ? 'Uploading...' : 'Upload'}
            </button>
            <input
              ref={qrFileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) uploadQr(file, targetId)
              }}
            />
          </div>
          {form.qrImage ? (
            <div className="mt-3 relative inline-block">
              <div className="w-28 h-28 rounded-xl border border-white/10 overflow-hidden bg-white flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.qrImage} alt="QR preview" className="w-full h-full object-contain" />
              </div>
              <button
                type="button"
                onClick={() => setField('qrImage', '')}
                className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-400 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="mt-2 flex items-center gap-2 text-slate-600 text-xs">
              <ImageIcon className="w-3.5 h-3.5" />
              Chưa có ảnh QR
            </div>
          )}
        </div>

        {/* Enable toggle */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/10">
          <p className="text-slate-300 text-sm">Kích hoạt ví này</p>
          <button
            type="button"
            onClick={() => setField('enabled', !form.enabled)}
          >
            {form.enabled
              ? <ToggleRight className="w-7 h-7 text-emerald-400" />
              : <ToggleLeft className="w-7 h-7 text-slate-500" />
            }
          </button>
        </div>

        {error && (
          <p className="text-red-400 text-sm">{error}</p>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-white text-sm font-semibold disabled:opacity-60 transition-all"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Đang lưu...' : 'Lưu'}
          </button>
          <button
            type="button"
            onClick={cancelEdit}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-white/20 text-slate-400 text-sm hover:text-white transition-all"
          >
            <X className="w-4 h-4" />
            Hủy
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="glass rounded-2xl border border-white/10 p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4 text-cyan-400" />
          <h3 className="text-white font-bold text-base">Thông tin ví điện tử</h3>
        </div>
        {!showAddForm && (
          <button
            type="button"
            onClick={startAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 text-sm font-medium hover:bg-cyan-500/25 transition-all"
          >
            <Plus className="w-4 h-4" />
            Thêm ví
          </button>
        )}
      </div>

      <p className="text-slate-400 text-sm -mt-2">
        Quản lý các ví điện tử để khách hàng thanh toán (MoMo, ZaloPay…). Trạng thái đơn hàng vẫn là "Chờ thanh toán" cho đến khi admin xác nhận.
      </p>

      {/* Add form */}
      {showAddForm && renderForm('new')}

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : methods.length === 0 && !showAddForm ? (
        <div className="text-center py-8 text-slate-500 text-sm">
          <Wallet className="w-10 h-10 mx-auto mb-3 opacity-20" />
          Chưa có ví điện tử nào. Bấm "Thêm ví" để bắt đầu.
        </div>
      ) : (
        <div className="space-y-3">
          {methods.map((m) => (
            <div key={m.id} className="border border-white/10 rounded-xl overflow-hidden">
              {/* Card header */}
              <div className="flex items-center gap-3 px-4 py-3 bg-white/[0.02]">
                <ProviderIcon provider={m.provider} />
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm truncate">{m.name}</p>
                  {m.accountNo && (
                    <p className="text-slate-400 text-xs font-mono">{m.accountNo}</p>
                  )}
                </div>
                {/* Status badge */}
                <span className={`px-2 py-0.5 rounded-md text-xs font-semibold border shrink-0 ${
                  m.enabled
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-slate-500/10 border-slate-500/30 text-slate-400'
                }`}>
                  {m.enabled ? 'Đang bật' : 'Tắt'}
                </span>
                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => toggleEnabled(m)}
                    title={m.enabled ? 'Tắt ví' : 'Bật ví'}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                  >
                    {m.enabled ? <ToggleRight className="w-4 h-4 text-emerald-400" /> : <ToggleLeft className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => editingId === m.id ? cancelEdit() : startEdit(m)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-white/10 transition-all"
                  >
                    {editingId === m.id ? <ChevronDown className="w-4 h-4 rotate-180" /> : <Pencil className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(m.id)}
                    disabled={deletingId === m.id}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-white/10 transition-all disabled:opacity-40"
                  >
                    {deletingId === m.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Inline edit form */}
              {editingId === m.id && (
                <div className="border-t border-white/10 p-4">
                  {renderForm(m.id)}
                </div>
              )}

              {/* Summary when not editing */}
              {editingId !== m.id && (m.accountName || m.transferNote || m.note) && (
                <div className="border-t border-white/5 px-4 py-2 space-y-1">
                  {m.accountName && (
                    <p className="text-slate-400 text-xs">Chủ ví: <span className="text-slate-300">{m.accountName}</span></p>
                  )}
                  {m.transferNote && (
                    <p className="text-slate-400 text-xs">Nội dung CK: <span className="text-cyan-400 font-mono">{m.transferNote}</span></p>
                  )}
                  {m.note && (
                    <p className="text-slate-500 text-xs italic">{m.note}</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
