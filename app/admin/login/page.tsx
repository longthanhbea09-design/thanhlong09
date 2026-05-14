'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { adminLoginSchema, type AdminLoginData } from '@/lib/validators'
import { Zap, Loader2, Eye, EyeOff } from 'lucide-react'
import TouchIDButton from '@/components/admin/TouchIDButton'

export default function AdminLoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AdminLoginData>({
    resolver: zodResolver(adminLoginSchema),
  })

  const onSubmit = async (data: AdminLoginData) => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, rememberMe }),
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.error || 'Đăng nhập thất bại')
        return
      }

      // Full reload so AdminLayout re-evaluates the JWT cookie server-side
      window.location.href = '/admin/dashboard'
    } catch {
      setError('Không thể kết nối. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 relative"
      style={{ background: '#050816' }}
    >
      {/* Anime background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/bg-login.jpg')" }}
      />
      {/* Overlay — nhẹ để ảnh vẫn thấy rõ */}
      <div className="absolute inset-0 bg-slate-950/40" />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-cyan-500/40">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-white font-extrabold text-3xl drop-shadow-lg">ThanhLongShop</h1>
          <p className="text-slate-300 mt-1 font-medium drop-shadow">Đăng nhập quản trị viên</p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="rounded-2xl p-8 border border-white/15 shadow-2xl space-y-5"
          style={{ background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(20px)' }}
        >
          <div>
            <label className="block text-white font-semibold mb-2">Account</label>
            <input
              {...register('email')}
              type="email"
              placeholder="Nhập tài khoản"
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400 focus:bg-white/15 transition-all text-base"
              autoComplete="username"
            />
            {errors.email && (
              <p className="text-red-400 text-sm mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block text-white font-semibold mb-2">Mật khẩu</label>
            <div className="relative">
              <input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400 focus:bg-white/15 transition-all text-base pr-12"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-red-400 text-sm mt-1">{errors.password.message}</p>
            )}
          </div>

          {/* Remember me */}
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded accent-cyan-500"
            />
            <span className="text-slate-300 text-sm">Ghi nhớ đăng nhập (30 ngày)</span>
          </label>

          {error && (
            <div className="bg-red-500/15 border border-red-400/30 rounded-xl p-4 text-red-300 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-white font-bold text-base transition-all duration-200 shadow-xl shadow-cyan-500/40 hover:shadow-cyan-500/60 hover:scale-[1.02] active:scale-100 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Đang đăng nhập...
              </>
            ) : (
              'Đăng nhập'
            )}
          </button>

          <div className="relative flex items-center gap-3 py-1">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-slate-500 text-xs">hoặc</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <TouchIDButton />
        </form>

        <p className="text-center text-slate-300 text-sm mt-6 drop-shadow font-medium">
          Trang quản trị chỉ dành cho admin ThanhLongShop
        </p>
      </div>
    </div>
  )
}
