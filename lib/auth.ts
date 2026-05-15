/**
 * JWT authentication helpers.
 *
 * Security rules:
 * - JWT_SECRET MUST be set in environment variables — no silent fallback.
 *   A missing secret causes a clear runtime error, not a silently insecure state.
 * - Tokens are stored only in httpOnly cookies (never localStorage).
 * - Token signing uses HS256 with a secret of at least 32 chars.
 */
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

export const COOKIE_NAME = 'tls-admin-token'

/**
 * Lazy-initialised secret bytes.
 * Throws a clear error if JWT_SECRET is absent or too short.
 * This runs the first time a token is signed or verified — never at import time,
 * so it does not break `next build` in environments without the variable set yet.
 */
let _secretBytes: Uint8Array | null = null

function getSecret(): Uint8Array {
  if (_secretBytes) return _secretBytes
  const s = process.env.JWT_SECRET
  if (!s || s.length < 32) {
    throw new Error(
      '[auth] JWT_SECRET is missing or too short (minimum 32 characters). ' +
        'Generate one with: openssl rand -base64 48'
    )
  }
  _secretBytes = new TextEncoder().encode(s)
  return _secretBytes
}

export async function signToken(
  payload: Record<string, unknown>,
  expiresIn = '7d'
): Promise<string> {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getSecret())
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return payload
  } catch {
    return null
  }
}

export async function getAdminFromCookie() {
  const cookieStore = cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null
  return await verifyToken(token)
}

/** Exposed for middleware which cannot import this module on Edge runtime. */
export function getJwtSecret() {
  return getSecret()
}
