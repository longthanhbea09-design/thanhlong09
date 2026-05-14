import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const settings = await prisma.setting.findFirst({ where: { id: 'singleton' } })
    if (!settings) {
      return NextResponse.json({ error: 'Không tìm thấy cài đặt' }, { status: 404 })
    }
    return NextResponse.json(settings)
  } catch (error) {
    console.error('GET /api/settings error:', error)
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
