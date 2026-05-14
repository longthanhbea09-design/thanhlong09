'use client'

import { useEffect, useState, useCallback } from 'react'
import { startRegistration } from '@simplewebauthn/browser'
import { Fingerprint, Trash2, Plus, Loader2, CheckCircle2, AlertCircle, Monitor } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface Passkey {
  id: string
  deviceName: string
  createdAt: string
  lastUsedAt: string | null
}

export default function PasskeyManager() {
  const [passkeys, setPasskeys] = useState<Passkey[]>([])
  const [loading, setLoading] = useState(true)
  const [registering, setRegistering] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [deviceName, setDeviceName] = useState('MacBook Touch ID')
  const [supported, setSupported] = useState(true)

  useEffect(() => {
    setSupported(
      typeof window !== 'undefined' &&
        !!window.PublicKeyCredential &&
        typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function'
    )
  }, [])

  const loadPasskeys = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/passkey')
      if (res.ok) {
        const data = await res.json()
        setPasskeys(data.passkeys)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadPasskeys() }, [loadPasskeys])

  const handleRegister = async () => {
    setRegistering(true)
    setMessage(null)
    try {
      // 1. Get registration options from server
      const optRes = await fetch('/api/admin/passkey/register/options', { method: 'POST' })
      if (!optRes.ok) {
        setMessage({ type: 'error', text: 'Không thể tạo yêu cầu đăng ký.' })
        return
      }
      const options = await optRes.json()

      // 2. Trigger Touch ID / platform authenticator
      const credential = await startRegistration({ optionsJSON: options })

      // 3. Send credential + deviceName to server for verification + storage
      const verRes = await fetch('/api/admin/passkey/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential, deviceName }),
      })
      const verData = await verRes.json()

      if (!verRes.ok) {
        setMessage({ type: 'error', text: verData.error || 'Đăng ký thất bại.' })
        return
      }

      setMessage({ type: 'success', text: `Đã kích hoạt Touch ID cho "${verData.deviceName}"!` })
      await loadPasskeys()
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'InvalidStateError') {
        setMessage({ type: 'error', text: 'Thiết bị này đã được đăng ký rồi.' })
      } else if (err instanceof Error && err.name === 'NotAllowedError') {
        setMessage({ type: 'error', text: 'Xác minh bị huỷ hoặc hết thời gian.' })
      } else {
        setMessage({ type: 'error', text: 'Đăng ký thất bại. Thử lại sau.' })
      }
    } finally {
      setRegistering(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Xoá passkey này? Bạn sẽ không thể dùng Touch ID trên thiết bị này nữa.')) return
    setDeletingId(id)
    try {
      const res = await fetch('/api/admin/passkey', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (res.ok) {
        setPasskeys((prev) => prev.filter((p) => p.id !== id))
        setMessage({ type: 'success', text: 'Đã xoá passkey.' })
      } else {
        setMessage({ type: 'error', text: 'Không thể xoá passkey.' })
      }
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="glass rounded-2xl border border-white/10 p-6 mt-6">
      <div className="flex items-center gap-2 mb-5">
        <Fingerprint className="w-5 h-5 text-cyan-400" />
        <h2 className="text-white font-bold text-lg">Touch ID / Passkey</h2>
      </div>

      {!supported && (
        <div className="flex items-start gap-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 mb-4">
          <AlertCircle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
          <p className="text-yellow-300 text-sm">
            Thiết bị hoặc trình duyệt này chưa hỗ trợ đăng nhập bằng Touch ID / Passkey.
          </p>
        </div>
      )}

      {message && (
        <div className={`flex items-center gap-2 rounded-xl p-3 mb-4 text-sm ${
          message.type === 'success'
            ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
            : 'bg-red-500/10 border border-red-500/30 text-red-400'
        }`}>
          {message.type === 'success'
            ? <CheckCircle2 className="w-4 h-4 shrink-0" />
            : <AlertCircle className="w-4 h-4 shrink-0" />}
          {message.text}
        </div>
      )}

      {/* Registered passkeys list */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
        </div>
      ) : passkeys.length === 0 ? (
        <p className="text-slate-500 text-sm text-center py-6">
          Chưa có passkey nào. Kích hoạt để đăng nhập bằng Touch ID.
        </p>
      ) : (
        <div className="space-y-2 mb-5">
          {passkeys.map((pk) => (
            <div
              key={pk.id}
              className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3"
            >
              <Monitor className="w-4 h-4 text-slate-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{pk.deviceName}</p>
                <p className="text-slate-500 text-xs">
                  Tạo {formatDate(pk.createdAt)}
                  {pk.lastUsedAt && ` · Dùng lần cuối ${formatDate(pk.lastUsedAt)}`}
                </p>
              </div>
              <button
                onClick={() => handleDelete(pk.id)}
                disabled={deletingId === pk.id}
                className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-50"
                title="Xoá passkey"
              >
                {deletingId === pk.id
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Trash2 className="w-4 h-4" />}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Register new passkey */}
      {supported && (
        <div className="space-y-3">
          <div>
            <label className="block text-slate-400 text-xs mb-1">Tên thiết bị</label>
            <input
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              placeholder="VD: MacBook Pro Touch ID"
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-400/50 transition-all"
            />
          </div>
          <button
            onClick={handleRegister}
            disabled={registering || !deviceName.trim()}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 font-semibold text-sm transition-all disabled:opacity-50"
          >
            {registering ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            {registering ? 'Đang kích hoạt Touch ID...' : 'Kích hoạt Touch ID / Passkey'}
          </button>
        </div>
      )}
    </div>
  )
}
