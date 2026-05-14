import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'thanhlongshop-secret-key-change-in-production'
)

const COOKIE_NAME = 'tls-admin-token'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname === '/admin/login') {
    return NextResponse.next()
  }

  if (pathname.startsWith('/admin')) {
    const token = request.cookies.get(COOKIE_NAME)?.value

    if (!token) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }

    try {
      await jwtVerify(token, JWT_SECRET)
      return NextResponse.next()
    } catch {
      const response = NextResponse.redirect(new URL('/admin/login', request.url))
      response.cookies.delete(COOKIE_NAME)
      return response
    }
  }

  if (pathname.startsWith('/api/admin') && pathname !== '/api/admin/login') {
    const token = request.cookies.get(COOKIE_NAME)?.value

    if (!token) {
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
  matcher: ['/admin/:path*', '/api/admin/:path*'],
}
