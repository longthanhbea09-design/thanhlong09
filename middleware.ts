import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'thanhlongshop-secret-key-change-in-production'
)
const COOKIE_NAME = 'tls-admin-token'

// Paths that attackers commonly probe — log and return 404
const HONEYPOT_PREFIXES = [
  '/wp-admin',
  '/wp-login',
  '/wp-content',
  '/wp-includes',
  '/phpmyadmin',
  '/pma',
  '/login-admin',
  '/administrator',
  '/admin-login',
  '/.env',
  '/.git',
  '/config.php',
  '/xmlrpc.php',
  '/backup',
  '/shell',
  '/cmd',
  '/.htaccess',
  '/setup.php',
  '/install.php',
  '/eval-stdin.php',
]

function getIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return req.ip || 'unknown'
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const ip = getIp(request)

  // ── Honeypot trap ──────────────────────────────────────────────────────────
  if (HONEYPOT_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    console.warn(
      '[SECURITY]',
      JSON.stringify({
        ts: new Date().toISOString(),
        event: 'HONEYPOT_TRIGGERED',
        path: pathname,
        ip,
        ua: request.headers.get('user-agent')?.slice(0, 120),
      })
    )
    return new NextResponse(null, { status: 404 })
  }

  // ── Admin page guard ───────────────────────────────────────────────────────
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const token = request.cookies.get(COOKIE_NAME)?.value
    if (!token) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
    try {
      await jwtVerify(token, JWT_SECRET)
      return NextResponse.next()
    } catch {
      const res = NextResponse.redirect(new URL('/admin/login', request.url))
      res.cookies.delete(COOKIE_NAME)
      return res
    }
  }

  // ── Admin API guard ────────────────────────────────────────────────────────
  // Passkey login endpoints are public (used before auth exists)
  const PUBLIC_API = [
    '/api/admin/login',
    '/api/admin/passkey/login/options',
    '/api/admin/passkey/login/verify',
  ]
  if (pathname.startsWith('/api/admin') && !PUBLIC_API.includes(pathname)) {
    const token = request.cookies.get(COOKIE_NAME)?.value
    if (!token) {
      console.warn(
        '[SECURITY]',
        JSON.stringify({
          ts: new Date().toISOString(),
          event: 'UNAUTHORIZED_API_ACCESS',
          path: pathname,
          ip,
        })
      )
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
    }
    try {
      await jwtVerify(token, JWT_SECRET)
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
    // Honeypot paths
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
  ],
}
