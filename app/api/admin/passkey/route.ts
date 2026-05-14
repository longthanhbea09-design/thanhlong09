import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAdminFromCookie } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const admin = await getAdminFromCookie()
  if (!admin) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })

  const passkeys = await prisma.adminPasskey.findMany({
    where: { adminId: admin.id as string },
    select: { id: true, deviceName: true, createdAt: true, lastUsedAt: true },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ passkeys })
}

export async function DELETE(request: NextRequest) {
  const admin = await getAdminFromCookie()
  if (!admin) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })

  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: 'Thiếu id' }, { status: 400 })

  // Ensure passkey belongs to this admin
  const passkey = await prisma.adminPasskey.findFirst({
    where: { id, adminId: admin.id as string },
  })
  if (!passkey) return NextResponse.json({ error: 'Không tìm thấy passkey' }, { status: 404 })

  await prisma.adminPasskey.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
