import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const COOKIE_NAME = 'tls-admin-token'

// ── JWT secret (lazy, same rule as lib/auth.ts — no silent fallback) ─────────
function getSecret(): Uint8Array {
  const s = process.env.JWT_SECRET
  if (!s || s.length < 32) {
    // In Edge runtime we cannot throw safely during routing — return a dummy
    // byte array that will always fail jwtVerify, forcing re-login.
    console.error('[middleware] JWT_SECRET missing or too short — all admin sessions will fail.')
    return new TextEncoder().encode('invalid-secret-will-always-reject-token-xxxxxxxxxx')
  }
  return new TextEncoder().encode(s)
}

// ── Common attacker probe paths ───────────────────────────────────────────────
const HONEYPOT_EXACT = new Set([
  '/.env',
  '/.env.local',
  '/.env.production',
  '/.git',
  '/config.php',
  '/xmlrpc.php',
  '/wp-login.php',
  '/wp-login',
  '/login-admin',
  '/admin-login',
  '/shell',
  '/cmd',
  '/.htaccess',
  '/setup.php',
  '/install.php',
  '/eval-stdin.php',
  '/api/swagger',
  '/api/swagger.json',
  '/api/openapi.json',
  '/api/graphql',
  '/api/debug',
  '/api/v1',
  '/api/v2',
])

const HONEYPOT_PREFIXES = [
  '/wp-admin',
  '/wp-content',
  '/wp-includes',
  '/phpmyadmin',
  '/pma',
  '/administrator',
  '/backup',
  '/.git/',
  '/api/v1/',
  '/api/v2/',
  '/api/debug/',
]

// Admin API honeypot endpoints — log even when authenticated (indicates probing)
const ADMIN_API_HONEYPOTS = new Set([
  '/api/admin/users/export',
  '/api/admin/database',
  '/api/admin/backup',
  '/api/admin/config',
  '/api/admin/env',
  '/api/admin/logs/raw',
])

function getIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return req.ip || 'unknown'
}

function honeypotLog(req: NextRequest, event: string) {
  console.warn(
    '[SECURITY]',
    JSON.stringify({
      ts: new Date().toISOString(),
      event,
      path: req.nextUrl.pathname,
      ip: getIp(req),
      ua: req.headers.get('user-agent')?.slice(0, 120),
      method: req.method,
    })
  )
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const ip = getIp(request)

  // ── 1. Path-based honeypot (no auth needed — attacker probing) ────────────
  const isHoneypotExact = HONEYPOT_EXACT.has(pathname)
  const isHoneypotPrefix = HONEYPOT_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p)
  )

  if (isHoneypotExact || isHoneypotPrefix) {
    honeypotLog(request, 'HONEYPOT_TRIGGERED')
    return new NextResponse(null, { status: 404 })
  }

  // ── 2. Admin API honeypot endpoints (log + 404, even if authenticated) ─────
  if (ADMIN_API_HONEYPOTS.has(pathname)) {
    honeypotLog(request, 'HONEYPOT_API_TRIGGERED')
    // Return a generic 404 — do not reveal that this path is monitored
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // ── 3. Admin page guard ───────────────────────────────────────────────────
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const token = request.cookies.get(COOKIE_NAME)?.value
    if (!token) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
    try {
      await jwtVerify(token, getSecret())
      return NextResponse.next()
    } catch {
      const res = NextResponse.redirect(new URL('/admin/login', request.url))
      res.cookies.delete(COOKIE_NAME)
      return res
    }
  }

  // ── 4. Admin API guard ────────────────────────────────────────────────────
  const PUBLIC_ADMIN_API = [
    '/api/admin/login',
    '/api/admin/passkey/login/options',
    '/api/admin/passkey/login/verify',
  ]
  if (pathname.startsWith('/api/admin') && !PUBLIC_ADMIN_API.includes(pathname)) {
    const token = request.cookies.get(COOKIE_NAME)?.value
    if (!token) {
      console.warn(
        '[SECURITY]',
        JSON.stringify({
          ts: new Date().toISOString(),
          event: 'UNAUTHORIZED_API_ACCESS',
          path: pathname,
          ip,
          method: request.method,
        })
      )
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
    }
    try {
      await jwtVerify(token, getSecret())
      return NextResponse.next()
    } catch {
      return NextResponse.json({ error: 'Phiên đăng nhập hết hạn' }, { status: 401 })
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Admin pages + APIs
    '/admin/:path*',
    '/api/admin/:path*',
    // Path honeypots
    '/wp-admin/:path*',
    '/wp-login',
    '/wp-login.php',
    '/wp-content/:path*',
    '/wp-includes/:path*',
    '/phpmyadmin/:path*',
    '/pma/:path*',
    '/login-admin',
    '/administrator/:path*',
    '/admin-login',
    '/.env',
    '/.env.local',
    '/.env.production',
    '/.git/:path*',
    '/config.php',
    '/xmlrpc.php',
    '/backup/:path*',
    '/shell',
    '/cmd',
    '/.htaccess',
    '/setup.php',
    '/install.php',
    '/eval-stdin.php',
    // API honeypots
    '/api/swagger',
    '/api/swagger.json',
    '/api/openapi.json',
    '/api/graphql',
    '/api/debug/:path*',
    '/api/v1/:path*',
    '/api/v2/:path*',
  ],
}
