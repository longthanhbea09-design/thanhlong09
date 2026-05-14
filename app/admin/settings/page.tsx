'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { settingSchema, type SettingData } from '@/lib/validators'
import AdminHeader from '@/components/admin/AdminHeader'
import { Save, Loader2, CheckCircle2 } from 'lucide-react'

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SettingData>({
    resolver: zodResolver(settingSchema),
  })

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((r) => r.json())
      .then((data) => {
        if (data) reset(data)
      })
      .finally(() => setLoading(false))
  }, [reset])

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

  const inputClass = 'w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-400/50 transition-all'
  const labelClass = 'block text-slate-300 text-sm font-medium mb-2'
  const errorClass = 'text-red-400 text-xs mt-1'

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
              {/* Shop info */}
              <div className="glass rounded-2xl border border-white/10 p-6 space-y-4">
                <h3 className="text-white font-bold text-base border-b border-white/10 pb-3">
                  Thông tin cửa hàng
                </h3>
                <div>
                  <label className={labelClass}>Tên cửa hàng</label>
                  <input {...register('shopName')} className={inputClass} />
                  {errors.shopName && <p className={errorClass}>{errors.shopName.message}</p>}
                </div>
                <div>
                  <label className={labelClass}>Email hỗ trợ</label>
                  <input {...register('supportEmail')} type="email" className={inputClass} />
                  {errors.supportEmail && <p className={errorClass}>{errors.supportEmail.message}</p>}
                </div>
              </div>

              {/* Contact */}
              <div className="glass rounded-2xl border border-white/10 p-6 space-y-4">
                <h3 className="text-white font-bold text-base border-b border-white/10 pb-3">
                  Kênh liên hệ
                </h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Số Zalo</label>
                    <input {...register('zalo')} placeholder="0924555517" className={inputClass} />
                    {errors.zalo && <p className={errorClass}>{errors.zalo.message}</p>}
                  </div>
                  <div>
                    <label className={labelClass}>Facebook</label>
                    <input {...register('facebook')} placeholder="Thành Long" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Telegram</label>
                    <input {...register('telegram')} placeholder="@thanhlongshop" className={inputClass} />
                  </div>
                </div>
              </div>

              {/* Banking */}
              <div className="glass rounded-2xl border border-white/10 p-6 space-y-4">
                <h3 className="text-white font-bold text-base border-b border-white/10 pb-3">
                  Thông tin ngân hàng
                </h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Tên ngân hàng</label>
                    <input {...register('bankName')} placeholder="Vietcombank" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Số tài khoản</label>
                    <input {...register('bankAccount')} placeholder="1234567890" className={inputClass} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Chủ tài khoản</label>
                    <input {...register('bankOwner')} placeholder="NGUYEN THANH LONG" className={inputClass} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>URL QR Code thanh toán</label>
                    <input
                      {...register('qrCodeUrl')}
                      placeholder="https://example.com/qr.png"
                      className={inputClass}
                    />
                    {errors.qrCodeUrl && <p className={errorClass}>{errors.qrCodeUrl.message}</p>}
                    <p className="text-slate-500 text-xs mt-1">
                      Để trống nếu chưa có QR code
                    </p>
                  </div>
                </div>
              </div>

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
                {saving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
                {saving ? 'Đang lưu...' : 'Lưu cài đặt'}
              </button>
            </form>
          )}
        </div>
      </main>
    </>
  )
}
