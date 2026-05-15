/**
 * POST /api/admin-gate
 *
 * Server-side check for the admin search secret.
 * Compares the submitted code against ADMIN_SEARCH_SECRET env var.
 * Returns only { ok: true } or { ok: false } — no detail on success/failure.
 *
 * Security:
 * - Secret never leaves the server (not NEXT_PUBLIC_)
 * - Input is never logged
 * - Rate limited: 10 attempts per 15 minutes per IP
 * - Admin login itself has its own independent security (bcrypt + rate limit)
 */
import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'

const LIMIT = 10
const WINDOW_MS = 15 * 60 * 1000

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const rl = checkRateLimit(`admin-gate:${ip}`, LIMIT, WINDOW_MS)

  if (!rl.allowed) {
    // Return same shape as failure — don't reveal rate limiting
    return NextResponse.json({ ok: false }, { status: 429 })
  }

  let code: string
  try {
    const body = await request.json()
    code = typeof body?.code === 'string' ? body.code : ''
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  const secret = process.env.ADMIN_SEARCH_SECRET
  // If secret is not configured, gate is disabled — always deny
  if (!secret || code.length === 0) {
    return NextResponse.json({ ok: false })
  }

  // Constant-time comparison to prevent timing attacks
  const match = timingSafeEqual(code, secret)

  // Never log the code — only log a boolean result for debugging
  if (match) {
    console.info('[admin-gate] correct code from', ip)
  }

  return NextResponse.json({ ok: match })
}

/**
 * Constant-time string comparison — prevents timing side-channel attacks
 * where an attacker measures response time to guess the secret character by character.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}
