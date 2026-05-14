'use client'

import { useEffect, useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { settingSchema, type SettingData } from '@/lib/validators'
import AdminHeader from '@/components/admin/AdminHeader'
import { VIET_BANKS } from '@/lib/vietqr'
import { Save, Loader2, CheckCircle2, Upload, Image as ImageIcon, X, ToggleLeft, ToggleRight, RotateCcw } from 'lucide-react'
import { DEFAULT_DELIVERY_TEMPLATE } from '@/lib/delivery'
import PasskeyManager from '@/components/admin/PasskeyManager'

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadingQr, setUploadingQr] = useState(false)
  const qrFileRef = useRef<HTMLInputElement>(null)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SettingData>({
    resolver: zodResolver(settingSchema),
    defaultValues: { maintenanceMode: false },
  })

  const maintenanceMode = watch('maintenanceMode')
  const qrCodeUrl = watch('qrCodeUrl')

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((r) => r.json())
      .then((data) => { if (data) reset({ ...data, maintenanceMode: data.maintenanceMode ?? false }) })
      .finally(() => setLoading(false))
  }, [reset])

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingQr(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })
      const json = await res.json()
      if (res.ok) {
        setValue('qrCodeUrl', json.url, { shouldValidate: true })
      } else {
        setError(json.error || 'Lỗi upload ảnh QR')
      }
    } catch {
      setError('Không thể upload ảnh QR')
    } finally {
      setUploadingQr(false)
      if (qrFileRef.current) qrFileRef.current.value = ''
    }
  }

  const onSubmit = async (data: SettingData) => {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || 'Lỗi khi lưu cài đặt')
        return
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setError('Không thể kết nối server')
    } finally {
      setSaving(false)
    }
  }

  const inp = 'w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-400/50 transition-all'
  const lbl = 'block text-slate-300 text-sm font-medium mb-2'
  const err = 'text-red-400 text-xs mt-1'

  return (
    <>
      <AdminHeader title="Cài đặt website" adminEmail="admin@thanhlongshop.net" />
      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-2xl mx-auto">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

              {/* 1. Shop info */}
              <div className="glass rounded-2xl border border-white/10 p-6 space-y-4">
                <h3 className="text-white font-bold text-base border-b border-white/10 pb-3">
                  Thông tin cửa hàng
                </h3>
                <div>
                  <label className={lbl}>Tên cửa hàng</label>
                  <input {...register('shopName')} className={inp} placeholder="ThanhLongShop" />
                  {errors.shopName && <p className={err}>{errors.shopName.message}</p>}
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className={lbl}>Email hỗ trợ</label>
                    <input {...register('supportEmail')} type="email" className={inp} placeholder="support@..." />
                    {errors.supportEmail && <p className={err}>{errors.supportEmail.message}</p>}
                  </div>
                  <div>
                    <label className={lbl}>Hotline</label>
                    <input {...register('hotline')} className={inp} placeholder="0900 000 000" />
                  </div>
                </div>
              </div>

              {/* 2. Social links */}
              <div className="glass rounded-2xl border border-white/10 p-6 space-y-4">
                <h3 className="text-white font-bold text-base border-b border-white/10 pb-3">
                  Liên hệ & Mạng xã hội
                </h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className={lbl}>Số Zalo</label>
                    <input {...register('zalo')} className={inp} placeholder="0924555517" />
                  </div>
                  <div>
                    <label className={lbl}>Link Zalo (URL)</label>
                    <input {...register('zaloLink')} className={inp} placeholder="https://zalo.me/..." />
                  </div>
                  <div>
                    <label className={lbl}>Tên Facebook</label>
                    <input {...register('facebook')} className={inp} placeholder="Thành Long" />
                  </div>
                  <div>
                    <label className={lbl}>Link Facebook (URL)</label>
                    <input {...register('facebookLink')} className={inp} placeholder="https://facebook.com/..." />
                  </div>
                  <div>
                    <label className={lbl}>Tên Telegram</label>
                    <input {...register('telegram')} className={inp} placeholder="@thanhlongshop" />
                  </div>
                  <div>
                    <label className={lbl}>Link Telegram (URL)</label>
                    <input {...register('telegramLink')} className={inp} placeholder="https://t.me/..." />
                  </div>
                </div>
              </div>

              {/* 3. Banking */}
              <div className="glass rounded-2xl border border-white/10 p-6 space-y-4">
                <h3 className="text-white font-bold text-base border-b border-white/10 pb-3">
                  Thông tin ngân hàng & QR
                </h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className={lbl}>Tên ngân hàng</label>
                    <input {...register('bankName')} className={inp} placeholder="MB Bank" />
                  </div>
                  <div>
                    <label className={lbl}>Mã ngân hàng VietQR (BIN)</label>
                    <select
                      {...register('bankBin')}
                      className={`${inp} cursor-pointer`}
                    >
                      <option value="" className="bg-[#0f172a]">— Chọn ngân hàng —</option>
                      {VIET_BANKS.map((b) => (
                        <option key={b.bin} value={b.bin} className="bg-[#0f172a]">
                          {b.name} ({b.bin})
                        </option>
                      ))}
                    </select>
                    <p className="text-slate-500 text-xs mt-1">
                      Chọn đúng ngân hàng để sinh QR tự động theo từng đơn hàng
                    </p>
                  </div>
                  <div>
                    <label className={lbl}>Số tài khoản</label>
                    <input {...register('bankAccount')} className={inp} placeholder="1234567890" />
                  </div>
                  <div>
                    <label className={lbl}>Chủ tài khoản</label>
                    <input {...register('bankOwner')} className={inp} placeholder="NGUYEN THANH LONG" />
                  </div>
                </div>

                {/* QR Upload */}
                <div>
                  <label className={lbl}>Ảnh QR thanh toán</label>
                  <div className="flex gap-2">
                    <input
                      {...register('qrCodeUrl')}
                      placeholder="/uploads/... hoặc https://..."
                      className={`${inp} flex-1`}
                    />
                    <button
                      type="button"
                      onClick={() => qrFileRef.current?.click()}
                      disabled={uploadingQr}
                      className="flex items-center gap-2 px-4 py-3 rounded-xl border border-white/20 text-slate-300 hover:text-white hover:border-white/40 hover:bg-white/5 transition-all text-sm shrink-0 disabled:opacity-50"
                    >
                      {uploadingQr ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      {uploadingQr ? 'Đang upload...' : 'Upload'}
                    </button>
                    <input
                      ref={qrFileRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/svg+xml,image/gif"
                      className="hidden"
                      onChange={handleQrUpload}
                    />
                  </div>

                  {/* QR Preview */}
                  {qrCodeUrl ? (
                    <div className="mt-3 relative inline-block">
                      <div className="w-32 h-32 rounded-xl border border-white/10 overflow-hidden bg-white flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={qrCodeUrl} alt="QR Code preview" className="w-full h-full object-contain" />
                      </div>
                      <button
                        type="button"
                        onClick={() => setValue('qrCodeUrl', '')}
                        className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-400 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="mt-2 flex items-center gap-2 text-slate-600 text-xs">
                      <ImageIcon className="w-3.5 h-3.5" />
                      Chưa có ảnh QR — tải lên hoặc nhập URL
                    </div>
                  )}
                </div>
              </div>

              {/* 4. Delivery template */}
              <div className="glass rounded-2xl border border-white/10 p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <h3 className="text-white font-bold text-base">Mẫu nội dung bàn giao</h3>
                  <button
                    type="button"
                    onClick={() => setValue('deliveryTemplate', DEFAULT_DELIVERY_TEMPLATE)}
                    className="flex items-center gap-1.5 text-slate-400 hover:text-white text-xs transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Khôi phục mặc định
                  </button>
                </div>
                <div className="bg-white/[0.03] rounded-xl p-3 text-xs text-slate-400 leading-relaxed">
                  <p className="text-slate-300 font-medium mb-2">Các biến hỗ trợ:</p>
                  <div className="grid grid-cols-2 gap-1 font-mono">
                    {['{{orderCode}}','{{productName}}','{{variantName}}','{{amount}}','{{createdAt}}','{{paidAt}}','{{customerName}}','{{phone}}','{{deliveryContent}}','{{shopName}}','{{zaloPhone}}'].map(v => (
                      <span key={v} className="text-cyan-400/80">{v}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <label className={lbl}>Template tin nhắn</label>
                  <textarea
                    {...register('deliveryTemplate')}
                    rows={12}
                    className={`${inp} resize-y font-mono text-xs`}
                    placeholder={DEFAULT_DELIVERY_TEMPLATE}
                  />
                  <p className="text-slate-500 text-xs mt-1">
                    Để trống sẽ dùng mẫu mặc định. Nội dung bàn giao admin nhập cho từng đơn sẽ thay vào <span className="text-cyan-400 font-mono">{'{{deliveryContent}}'}</span>
                  </p>
                </div>
              </div>

              {/* 5. Maintenance */}
              <div className="glass rounded-2xl border border-white/10 p-6 space-y-4">
                <h3 className="text-white font-bold text-base border-b border-white/10 pb-3">
                  Chế độ bảo trì
                </h3>

                <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/10">
                  <div>
                    <p className="text-white font-medium text-sm">Bật chế độ bảo trì</p>
                    <p className="text-slate-500 text-xs mt-0.5">
                      Khách thấy trang bảo trì. Admin vẫn vào được /admin.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setValue('maintenanceMode', !maintenanceMode, { shouldValidate: true })}
                    className="flex items-center gap-2"
                  >
                    {maintenanceMode ? (
                      <ToggleRight className="w-8 h-8 text-orange-400" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-slate-500" />
                    )}
                    <span className={`text-sm font-medium ${maintenanceMode ? 'text-orange-400' : 'text-slate-500'}`}>
                      {maintenanceMode ? 'Đang bảo trì' : 'Hoạt động'}
                    </span>
                  </button>
                </div>

                {maintenanceMode && (
                  <div className="space-y-3">
                    <div>
                      <label className={lbl}>Tiêu đề trang bảo trì</label>
                      <input
                        {...register('maintenanceTitle')}
                        className={inp}
                        placeholder="Website đang bảo trì"
                      />
                    </div>
                    <div>
                      <label className={lbl}>Nội dung thông báo</label>
                      <textarea
                        {...register('maintenanceMessage')}
                        rows={3}
                        className={`${inp} resize-none`}
                        placeholder="ThanhLongShop đang nâng cấp hệ thống, vui lòng quay lại sau ít phút."
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Messages */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
                  {error}
                </div>
              )}
              {saved && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-emerald-400 text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Đã lưu cài đặt thành công!
                </div>
              )}

              <button
                type="submit"
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-white font-bold text-base disabled:opacity-60 transition-all shadow-xl shadow-cyan-500/20"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                {saving ? 'Đang lưu...' : 'Lưu cài đặt'}
              </button>
            </form>
          )}

          {/* Passkey / Touch ID management */}
          <PasskeyManager />
        </div>
      </main>
    </>
  )
}
