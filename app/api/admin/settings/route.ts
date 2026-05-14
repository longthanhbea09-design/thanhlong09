import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { settingSchema } from '@/lib/validators'

export async function GET() {
  try {
    const settings = await prisma.setting.findFirst({ where: { id: 'singleton' } })
    return NextResponse.json(settings)
  } catch (error) {
    console.error('GET /api/admin/settings error:', error)
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = settingSchema.partial().safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dữ liệu không hợp lệ', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const settings = await prisma.setting.upsert({
      where: { id: 'singleton' },
      update: parsed.data,
      create: { id: 'singleton', ...parsed.data },
    })
    return NextResponse.json(settings)
  } catch (error) {
    console.error('PATCH /api/admin/settings error:', error)
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
