import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { adminLoginSchema } from '@/lib/validators'
import { signToken, COOKIE_NAME } from '@/lib/auth'
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rateLimit'
import { securityLog } from '@/lib/securityLog'
import bcrypt from 'bcryptjs'

// 5 attempts per 15 minutes per IP
const LIMIT = 5
const WINDOW_MS = 15 * 60 * 1000

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const rl = checkRateLimit(`login:${ip}`, LIMIT, WINDOW_MS)

  if (!rl.allowed) {
    securityLog('ADMIN_LOGIN_RATE_LIMITED', { ip, retryAfter: rl.retryAfter })
    return rateLimitResponse(rl.retryAfter)
  }

  try {
    const body = await request.json()
    const rememberMe = body.rememberMe === true
    const parsed = adminLoginSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Email hoặc mật khẩu không hợp lệ' }, { status: 400 })
    }

    const { email, password } = parsed.data

    const admin = await prisma.admin.findUnique({ where: { email } })
    if (!admin) {
      securityLog('ADMIN_LOGIN_FAILED', { ip, email, reason: 'email_not_found' })
      // Constant-time fake compare to avoid timing attacks
      await bcrypt.compare(password, '$2a$12$fakehashfakehashfakehashfakehashfakehashfakehash')
      return NextResponse.json({ error: 'Email hoặc mật khẩu không đúng' }, { status: 401 })
    }

    const isValid = await bcrypt.compare(password, admin.passwordHash)
    if (!isValid) {
      securityLog('ADMIN_LOGIN_FAILED', { ip, email, reason: 'wrong_password' })
      return NextResponse.json({ error: 'Email hoặc mật khẩu không đúng' }, { status: 401 })
    }

    const expiresIn = rememberMe ? '30d' : '1d'
    const maxAge = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24

    const token = await signToken(
      { id: admin.id, email: admin.email, role: admin.role },
      expiresIn
    )

    securityLog('ADMIN_LOGIN_SUCCESS', { ip, email, rememberMe: String(rememberMe) })

    const response = NextResponse.json({
      success: true,
      admin: { id: admin.id, email: admin.email, role: admin.role },
    })

    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('POST /api/admin/login error:', error)
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
