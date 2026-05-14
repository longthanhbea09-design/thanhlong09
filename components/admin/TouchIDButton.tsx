'use client'

import { useState, useEffect } from 'react'
import { startAuthentication } from '@simplewebauthn/browser'
import { Fingerprint, Loader2 } from 'lucide-react'

interface Props {
  onSuccess?: () => void
}

export default function TouchIDButton({ onSuccess }: Props) {
  const [supported, setSupported] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setSupported(
      typeof window !== 'undefined' &&
        !!window.PublicKeyCredential &&
        typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function'
    )
  }, [])

  const handleTouchID = async () => {
    setLoading(true)
    setError(null)
    try {
      // 1. Get challenge from server
      const optRes = await fetch('/api/admin/passkey/login/options', { method: 'POST' })
      if (!optRes.ok) {
        setError('Không thể kết nối server.')
        return
      }
      const options = await optRes.json()

      // 2. Trigger platform authenticator (Touch ID popup)
      const assertion = await startAuthentication({ optionsJSON: options })

      // 3. Verify with server
      const verRes = await fetch('/api/admin/passkey/login/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assertion),
      })
      const verData = await verRes.json()

      if (!verRes.ok) {
        setError(verData.error || 'Xác minh thất bại.')
        return
      }

      // 4. Success — full reload so layout picks up the new JWT cookie
      if (onSuccess) onSuccess()
      else window.location.href = '/admin/dashboard'
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'NotAllowedError') {
        setError('Xác minh bị huỷ hoặc hết thời gian.')
      } else {
        setError('Đăng nhập Touch ID thất bại.')
      }
    } finally {
      setLoading(false)
    }
  }

  // Hide if WebAuthn not supported
  if (supported === false) return null
  if (supported === null) return null // still checking

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleTouchID}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border border-white/20 bg-white/8 hover:bg-white/12 text-white font-semibold text-sm transition-all disabled:opacity-50 backdrop-blur-sm"
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Fingerprint className="w-5 h-5 text-cyan-400" />
        )}
        {loading ? 'Đang xác minh Touch ID...' : 'Đăng nhập bằng Touch ID'}
      </button>
      {error && (
        <p className="text-red-400 text-xs text-center">{error}</p>
      )}
    </div>
  )
}
