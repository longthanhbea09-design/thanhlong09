/**
 * WebAuthn helpers for admin passkey authentication.
 * Challenges are stored in-memory with 5-minute TTL — single-process only (dev/prod single instance).
 * Public keys are stored in the database; private keys and biometric data never leave the device.
 */

declare global {
  var _passkeyChallenge: Map<string, { challenge: string; expiresAt: number }> | undefined
}

const store: Map<string, { challenge: string; expiresAt: number }> =
  globalThis._passkeyChallenge ?? (globalThis._passkeyChallenge = new Map())

const CHALLENGE_TTL_MS = 5 * 60 * 1000 // 5 minutes

// Purge expired challenges every 10 minutes
setInterval(() => {
  const now = Date.now()
  store.forEach((v, k) => { if (now > v.expiresAt) store.delete(k) })
}, 10 * 60 * 1000).unref?.()

export function saveChallenge(key: string, challenge: string) {
  store.set(key, { challenge, expiresAt: Date.now() + CHALLENGE_TTL_MS })
}

export function consumeChallenge(key: string): string | null {
  const entry = store.get(key)
  if (!entry || Date.now() > entry.expiresAt) {
    store.delete(key)
    return null
  }
  store.delete(key) // one-time use
  return entry.challenge
}

/** rpID = domain without scheme/port. Must match what the browser sees. */
export function getRpId(): string {
  return process.env.WEBAUTHN_RP_ID || 'localhost'
}

/** Origin must exactly match the browser's window.location.origin */
export function getExpectedOrigin(): string {
  return process.env.WEBAUTHN_ORIGIN || 'http://localhost:3000'
}

export const RP_NAME = 'ThanhLongShop Admin'
