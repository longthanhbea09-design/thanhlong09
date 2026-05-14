import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { adminLoginSchema } from '@/lib/validators'
import { signToken, COOKIE_NAME } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = adminLoginSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Email hoặc mật khẩu không hợp lệ' }, { status: 400 })
    }

    const { email, password } = parsed.data

    const admin = await prisma.admin.findUnique({ where: { email } })
    if (!admin) {
      return NextResponse.json({ error: 'Email hoặc mật khẩu không đúng' }, { status: 401 })
    }

    const isValid = await bcrypt.compare(password, admin.passwordHash)
    if (!isValid) {
      return NextResponse.json({ error: 'Email hoặc mật khẩu không đúng' }, { status: 401 })
    }

    const token = await signToken({
      id: admin.id,
      email: admin.email,
      role: admin.role,
    })

    const response = NextResponse.json({
      success: true,
      admin: { id: admin.id, email: admin.email, role: admin.role },
    })

    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    })

    return response
  } catch (error) {
    console.error('POST /api/admin/login error:', error)
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
