'use client'

import { useEffect, useState } from 'react'
import AdminHeader from '@/components/admin/AdminHeader'
import { VIET_BANKS } from '@/lib/vietqr'
import {
  Save, Loader2, CheckCircle2, AlertTriangle, Eye, EyeOff,
  CreditCard, Landmark, Ban, ToggleLeft, ToggleRight, Info, Copy, Check,
} from 'lucide-react'

type ActiveMethod = 'MOMO' | 'MB_BANK' | 'DISABLED'

interface FormState {
  activePaymentMethod: ActiveMethod
  // MoMo
  momoEnabled: boolean
  momoMode: string
  momoPartnerCode: string
  momoAccessKey: string
  momoSecretKeyRaw: string
  momoEndpoint: string
  momoReturnUrl: string
  momoIpnUrl: string
  momoHasSecret: boolean
  // MB Bank + SePay
  mbBankEnabled: boolean
  mbBankName: string
  mbBankBin: string
  mbBankAccountNumber: string
  mbBankAccountName: string
  mbBankPaymentContentPrefix: string
  mbBankQrProvider: string
  mbBankAutoConfirmEnabled: boolean
  sePayApiKeyRaw: string
  sePayHasApiKey: boolean
  sePayWebhookUrl: string  // custom webhook URL; empty = use env-based default
  // Delivery
  autoDeliverAfterPaid: boolean
  allowManualConfirm: boolean
}

const DEFAULTS: FormState = {
  activePaymentMethod: 'MB_BANK',
  momoEnabled: false,
  momoMode: 'sandbox',
  momoPartnerCode: '',
  momoAccessKey: '',
  momoSecretKeyRaw: '',
  momoEndpoint: 'https://test-payment.momo.vn',
  momoReturnUrl: '',
  momoIpnUrl: '',
  momoHasSecret: false,
  mbBankEnabled: true,
  mbBankName: 'MB Bank',
  mbBankBin: '970422',
  mbBankAccountNumber: '',
  mbBankAccountName: '',
  mbBankPaymentContentPrefix: 'THANHLONG',
  mbBankQrProvider: 'vietqr',
  mbBankAutoConfirmEnabled: false,
  sePayApiKeyRaw: '',
  sePayHasApiKey: false,
  sePayWebhookUrl: '',
  autoDeliverAfterPaid: true,
  allowManualConfirm: true,
}

const inp = 'w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-400/50 transition-all'
const lbl = 'block text-slate-300 text-sm font-medium mb-2'

function ToggleRow({ label, desc, value, onChange }: { label: string; desc?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/10">
      <div>
        <p className="text-white font-medium text-sm">{label}</p>
        {desc && <p className="text-slate-500 text-xs mt-0.5">{desc}</p>}
      </div>
      <button type="button" onClick={() => onChange(!value)}>
        {value ? <ToggleRight className="w-8 h-8 text-emerald-400" /> : <ToggleLeft className="w-8 h-8 text-slate-500" />}
      </button>
    </div>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/20 text-slate-400 hover:text-white hover:border-white/40 transition-all text-xs shrink-0"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Đã copy' : 'Copy'}
    </button>
  )
}

export default function PaymentSettingsPage() {
  const [form, setForm] = useState<FormState>(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showMomoSecret, setShowMomoSecret] = useState(false)
  const [showSePayKey, setShowSePayKey] = useState(false)

  // Resolve site origin on client (fallback when NEXT_PUBLIC_SITE_URL is absent)
  const [originUrl, setOriginUrl] = useState('')
  useEffect(() => {
    setOriginUrl(window.location.origin)
  }, [])

  // Priority: custom URL in DB → NEXT_PUBLIC_SITE_URL → window.location.origin
  const envSiteUrl = process.env.NEXT_PUBLIC_SITE_URL || originUrl
  const defaultWebhookUrl = `${envSiteUrl}/api/payments/sepay/webhook`
  const effectiveWebhookUrl = form.sePayWebhookUrl.trim() || defaultWebhookUrl

  const isLocalhostWarning =
    process.env.NODE_ENV === 'production' && effectiveWebhookUrl.includes('localhost')

  useEffect(() => {
    fetch('/api/admin/payment-settings')
      .then((r) => r.json())
      .then((data) => {
        setForm({
          ...DEFAULTS,
          ...data,
          momoSecretKeyRaw: '',
          sePayApiKeyRaw: '',
          momoHasSecret: data.momoHasSecret ?? false,
          sePayHasApiKey: data.sePayHasApiKey ?? false,
          sePayWebhookUrl: data.sePayWebhookUrl ?? '',
          momoPartnerCode: data.momoPartnerCode ?? '',
          momoAccessKey: data.momoAccessKey ?? '',
          momoEndpoint: data.momoEndpoint ?? 'https://test-payment.momo.vn',
          momoReturnUrl: data.momoReturnUrl ?? '',
          momoIpnUrl: data.momoIpnUrl ?? '',
          mbBankBin: data.mbBankBin ?? '970422',
          mbBankAccountNumber: data.mbBankAccountNumber ?? '',
          mbBankAccountName: data.mbBankAccountName ?? '',
          mbBankPaymentContentPrefix: data.mbBankPaymentContentPrefix ?? 'THANHLONG',
        })
      })
      .catch(() => setError('Không thể tải cấu hình'))
      .finally(() => setLoading(false))
  }, [])

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const momoConfigOk =
    !!form.momoPartnerCode && !!form.momoAccessKey &&
    (form.momoHasSecret || !!form.momoSecretKeyRaw) && !!form.momoIpnUrl
  const mbBankConfigOk = !!form.mbBankAccountNumber && !!form.mbBankAccountName && !!form.mbBankBin
  const sePayConfigOk = form.sePayHasApiKey || !!form.sePayApiKeyRaw

  const warnings: string[] = []
  if (form.activePaymentMethod === 'MOMO' && !momoConfigOk) {
    warnings.push('Đang dùng MoMo nhưng cấu hình chưa đủ (thiếu Partner Code, Access Key, Secret Key hoặc IPN URL).')
  }
  if (form.activePaymentMethod === 'MB_BANK' && !mbBankConfigOk) {
    warnings.push('Đang dùng MB Bank nhưng chưa nhập đủ số tài khoản, tên chủ TK hoặc BIN ngân hàng.')
  }
  if (form.activePaymentMethod === 'MB_BANK' && !sePayConfigOk) {
    warnings.push('SePay API Key chưa cấu hình — webhook sẽ từ chối mọi yêu cầu. Nhập API key để bật xác nhận tự động.')
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const body: Record<string, unknown> = {
        activePaymentMethod: form.activePaymentMethod,
        momoEnabled: form.momoEnabled,
        momoMode: form.momoMode,
        momoPartnerCode: form.momoPartnerCode || null,
        momoAccessKey: form.momoAccessKey || null,
        momoEndpoint: form.momoEndpoint || null,
        momoReturnUrl: form.momoReturnUrl || null,
        momoIpnUrl: form.momoIpnUrl || null,
        mbBankEnabled: form.mbBankEnabled,
        mbBankName: form.mbBankName,
        mbBankBin: form.mbBankBin || null,
        mbBankAccountNumber: form.mbBankAccountNumber || null,
        mbBankAccountName: form.mbBankAccountName || null,
        mbBankPaymentContentPrefix: form.mbBankPaymentContentPrefix,
        mbBankQrProvider: form.mbBankQrProvider,
        mbBankAutoConfirmEnabled: false,
        sePayWebhookUrl: form.sePayWebhookUrl.trim() || null,
        autoDeliverAfterPaid: form.autoDeliverAfterPaid,
        allowManualConfirm: form.allowManualConfirm,
      }
      if (form.momoSecretKeyRaw.trim()) body.momoSecretKeyRaw = form.momoSecretKeyRaw.trim()
      if (form.sePayApiKeyRaw.trim()) body.sePayApiKeyRaw = form.sePayApiKeyRaw.trim()

      const res = await fetch('/api/admin/payment-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error || 'Lỗi khi lưu'); return }

      setSaved(true)
      if (form.momoSecretKeyRaw.trim()) setForm((p) => ({ ...p, momoHasSecret: true, momoSecretKeyRaw: '' }))
      if (form.sePayApiKeyRaw.trim()) setForm((p) => ({ ...p, sePayHasApiKey: true, sePayApiKeyRaw: '' }))
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setError('Không thể kết nối server')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <>
        <AdminHeader title="Cấu hình thanh toán" adminEmail="admin@longshop.net" />
        <main className="flex-1 p-6 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        </main>
      </>
    )
  }

  return (
    <>
      <AdminHeader title="Cấu hình thanh toán" adminEmail="admin@longshop.net" />
      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-2xl mx-auto space-y-6">

          {/* ── 1. Active method selector ── */}
          <div className="glass rounded-2xl border border-white/10 p-6 space-y-4">
            <h3 className="text-white font-bold text-base border-b border-white/10 pb-3">
              Phương thức thanh toán đang áp dụng
            </h3>
            <p className="text-slate-400 text-sm">
              Chỉ phương thức được chọn ở đây mới hiển thị cho khách. Khách không được tự chọn.
            </p>

            <div className="grid sm:grid-cols-3 gap-3">
              {([
                { value: 'MB_BANK', icon: <Landmark className="w-5 h-5" />, label: 'MB Bank', desc: 'Chuyển khoản tự động' },
                { value: 'MOMO', icon: <CreditCard className="w-5 h-5" />, label: 'MoMo', desc: 'Ví điện tử MoMo' },
                { value: 'DISABLED', icon: <Ban className="w-5 h-5" />, label: 'Tắt thanh toán', desc: 'Khách không mua được' },
              ] as const).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => set('activePaymentMethod', opt.value as ActiveMethod)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border text-center transition-all ${
                    form.activePaymentMethod === opt.value
                      ? opt.value === 'DISABLED'
                        ? 'bg-red-500/10 border-red-500/40 text-red-300'
                        : 'bg-cyan-500/10 border-cyan-500/40 text-white'
                      : 'bg-white/[0.02] border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                  }`}
                >
                  {opt.icon}
                  <span className="text-sm font-semibold">{opt.label}</span>
                  <span className="text-xs opacity-70">{opt.desc}</span>
                </button>
              ))}
            </div>

            {warnings.map((w) => (
              <div key={w} className="flex items-start gap-2 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                <p className="text-yellow-300 text-sm">{w}</p>
              </div>
            ))}
          </div>

          {/* ── 2. MB Bank + SePay config ── */}
          <div className={`glass rounded-2xl border p-6 space-y-5 transition-all ${
            form.activePaymentMethod === 'MB_BANK' ? 'border-cyan-500/30' : 'border-white/10 opacity-80'
          }`}>
            <div className="flex items-center gap-3 border-b border-white/10 pb-3">
              <Landmark className="w-4 h-4 text-cyan-400" />
              <h3 className="text-white font-bold text-base flex-1">Cấu hình MB Bank</h3>
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                sePayConfigOk && mbBankConfigOk
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
              }`}>
                {sePayConfigOk && mbBankConfigOk ? 'Tự động qua SePay' : 'Chưa cấu hình đủ'}
              </span>
            </div>

            {/* Bank account info */}
            <div>
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">Thông tin tài khoản ngân hàng</p>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={lbl}>Tên ngân hàng</label>
                  <input
                    value={form.mbBankName}
                    onChange={(e) => set('mbBankName', e.target.value)}
                    className={inp}
                    placeholder="MB Bank"
                  />
                </div>
                <div>
                  <label className={lbl}>BIN ngân hàng (VietQR)</label>
                  <select
                    value={form.mbBankBin}
                    onChange={(e) => set('mbBankBin', e.target.value)}
                    className={`${inp} cursor-pointer`}
                  >
                    <option value="" className="bg-[#0f172a]">— Chọn ngân hàng —</option>
                    {VIET_BANKS.map((b) => (
                      <option key={b.bin} value={b.bin} className="bg-[#0f172a]">
                        {b.name} ({b.bin})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={lbl}>Số tài khoản</label>
                  <input
                    value={form.mbBankAccountNumber}
                    onChange={(e) => set('mbBankAccountNumber', e.target.value)}
                    className={inp}
                    placeholder="0830812200"
                  />
                </div>
                <div>
                  <label className={lbl}>Tên chủ tài khoản</label>
                  <input
                    value={form.mbBankAccountName}
                    onChange={(e) => set('mbBankAccountName', e.target.value)}
                    className={inp}
                    placeholder="NGUYEN CONG THANH LONG"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={lbl}>Tiền tố nội dung chuyển khoản</label>
                  <input
                    value={form.mbBankPaymentContentPrefix}
                    onChange={(e) => set('mbBankPaymentContentPrefix', e.target.value.toUpperCase())}
                    className={inp}
                    placeholder="THANHLONG"
                  />
                  <p className="text-slate-500 text-xs mt-1">
                    Mỗi đơn sẽ yêu cầu nội dung:{' '}
                    <span className="font-mono text-cyan-400">{form.mbBankPaymentContentPrefix || 'THANHLONG'} TLS-YYYYMMDD-XXXX</span>
                  </p>
                </div>
              </div>
            </div>

            {/* SePay webhook config */}
            <div className="border-t border-white/10 pt-5">
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">Tích hợp SePay (tự động xác nhận)</p>

              {/* Webhook URL — editable, saved to DB */}
              <div className="mb-4">
                <label className={lbl}>Webhook URL (copy vào SePay Dashboard)</label>
                <div className="flex items-center gap-2">
                  <input
                    value={form.sePayWebhookUrl}
                    onChange={(e) => set('sePayWebhookUrl', e.target.value)}
                    className={`${inp} flex-1 font-mono text-xs text-cyan-400`}
                    placeholder={defaultWebhookUrl}
                  />
                  <CopyButton text={effectiveWebhookUrl} />
                </div>
                <p className="text-slate-500 text-xs mt-1">
                  Để trống = tự dùng <span className="font-mono text-slate-400">{defaultWebhookUrl}</span>.
                  Localhost chỉ dùng test bằng curl/Postman. Khi deploy public, hãy dùng domain thật như{' '}
                  <span className="font-mono text-slate-400">https://thanhlongshop.id.vn/api/payments/sepay/webhook</span>
                </p>
                {isLocalhostWarning && (
                  <div className="mt-2 flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <p className="text-red-300 text-xs">
                      Webhook URL đang là localhost. SePay không thể gọi về local. Hãy đổi thành domain thật.
                    </p>
                  </div>
                )}
              </div>

              {/* SePay API Key */}
              <div>
                <label className={lbl}>
                  SePay API Key
                  {form.sePayHasApiKey && (
                    <span className="ml-2 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs">
                      Đã cấu hình
                    </span>
                  )}
                </label>
                <div className="flex gap-2">
                  <input
                    type={showSePayKey ? 'text' : 'password'}
                    value={form.sePayApiKeyRaw}
                    onChange={(e) => set('sePayApiKeyRaw', e.target.value)}
                    className={`${inp} flex-1`}
                    placeholder={form.sePayHasApiKey ? '••••••••  (để trống = giữ nguyên)' : 'Nhập SePay API Key...'}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSePayKey(!showSePayKey)}
                    className="px-3 py-2 rounded-xl border border-white/20 text-slate-400 hover:text-white transition-all"
                  >
                    {showSePayKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-slate-500 text-xs mt-1">
                  Lấy từ SePay Dashboard → Tích hợp → API. Được mã hóa AES-256-GCM trước khi lưu. Để trống = giữ nguyên.
                </p>
              </div>

              {/* Info box */}
              <div className="mt-4 flex items-start gap-2 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <p className="text-blue-300 text-sm">
                  SePay theo dõi biến động số dư MB Bank và gọi webhook tự động. Khi khớp mã đơn và số tiền, hệ thống tự cập nhật PAID và giao tài khoản. Không cần admin xác nhận thủ công.
                </p>
              </div>
            </div>
          </div>

          {/* ── 3. MoMo config ── */}
          <div className={`glass rounded-2xl border p-6 space-y-4 transition-all ${
            form.activePaymentMethod === 'MOMO' ? 'border-purple-500/30' : 'border-white/10 opacity-70'
          }`}>
            <div className="flex items-center gap-3 border-b border-white/10 pb-3">
              <CreditCard className="w-4 h-4 text-purple-400" />
              <h3 className="text-white font-bold text-base flex-1">Cấu hình MoMo</h3>
              {momoConfigOk ? (
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                  Đủ cấu hình
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-500/10 border border-slate-500/30 text-slate-400">
                  Chưa cấu hình
                </span>
              )}
            </div>

            <div>
              <label className={lbl}>Chế độ</label>
              <select
                value={form.momoMode}
                onChange={(e) => set('momoMode', e.target.value)}
                className={`${inp} cursor-pointer`}
              >
                <option value="sandbox" className="bg-[#0f172a]">Sandbox (test)</option>
                <option value="production" className="bg-[#0f172a]">Production (thật)</option>
              </select>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className={lbl}>Partner Code</label>
                <input
                  value={form.momoPartnerCode}
                  onChange={(e) => set('momoPartnerCode', e.target.value)}
                  className={inp}
                  placeholder="MOMO..."
                />
              </div>
              <div>
                <label className={lbl}>Access Key</label>
                <input
                  value={form.momoAccessKey}
                  onChange={(e) => set('momoAccessKey', e.target.value)}
                  className={inp}
                  placeholder="F8BBA842ECF85..."
                />
              </div>
            </div>

            <div>
              <label className={lbl}>
                Secret Key
                {form.momoHasSecret && (
                  <span className="ml-2 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs">
                    Đã cấu hình
                  </span>
                )}
              </label>
              <div className="flex gap-2">
                <input
                  type={showMomoSecret ? 'text' : 'password'}
                  value={form.momoSecretKeyRaw}
                  onChange={(e) => set('momoSecretKeyRaw', e.target.value)}
                  className={`${inp} flex-1`}
                  placeholder={form.momoHasSecret ? '••••••••  (để trống = giữ nguyên)' : 'Nhập MoMo Secret Key...'}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowMomoSecret(!showMomoSecret)}
                  className="px-3 py-2 rounded-xl border border-white/20 text-slate-400 hover:text-white transition-all"
                >
                  {showMomoSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-slate-500 text-xs mt-1">Mã hóa AES-256-GCM. Để trống = không thay đổi.</p>
            </div>

            <div>
              <label className={lbl}>Endpoint</label>
              <input
                value={form.momoEndpoint}
                onChange={(e) => set('momoEndpoint', e.target.value)}
                className={inp}
                placeholder="https://test-payment.momo.vn"
              />
            </div>
            <div>
              <label className={lbl}>IPN URL</label>
              <input
                value={form.momoIpnUrl}
                onChange={(e) => set('momoIpnUrl', e.target.value)}
                className={inp}
                placeholder="https://yourdomain.com/api/payments/momo/ipn"
              />
            </div>
            <div>
              <label className={lbl}>Return URL</label>
              <input
                value={form.momoReturnUrl}
                onChange={(e) => set('momoReturnUrl', e.target.value)}
                className={inp}
                placeholder="https://yourdomain.com/payment/momo/return"
              />
            </div>
          </div>

          {/* ── 4. Delivery settings ── */}
          <div className="glass rounded-2xl border border-white/10 p-6 space-y-4">
            <h3 className="text-white font-bold text-base border-b border-white/10 pb-3">
              Cài đặt giao hàng
            </h3>
            <ToggleRow
              label="Tự động giao tài khoản sau khi PAID"
              desc="Hệ thống giao ngay khi đơn được xác nhận thanh toán (SePay webhook hoặc MoMo IPN)"
              value={form.autoDeliverAfterPaid}
              onChange={(v) => set('autoDeliverAfterPaid', v)}
            />
            <ToggleRow
              label="Cho phép admin xác nhận thanh toán thủ công"
              desc="Hiển thị nút 'Xác nhận đã TT' trong trang quản lý đơn hàng (dự phòng khi webhook lỗi)"
              value={form.allowManualConfirm}
              onChange={(v) => set('allowManualConfirm', v)}
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">{error}</div>
          )}
          {saved && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-emerald-400 text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Đã lưu cấu hình thanh toán!
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-white font-bold text-base disabled:opacity-60 shadow-xl shadow-cyan-500/20 transition-all"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
          </button>
        </div>
      </main>
    </>
  )
}
