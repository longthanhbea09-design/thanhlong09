import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { guardObjectId } from '@/lib/db/real'

const patchSchema = z.object({
  username: z.string().min(1).optional(),
  password: z.string().min(1).optional(),
  extraInfo: z.string().optional(),
  status: z.enum(['available', 'disabled']).optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const guard = guardObjectId(params.id)
  if (guard) return guard
  try {
    const body = await request.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dữ liệu không hợp lệ', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const account = await prisma.accountStock.findUnique({ where: { id: params.id } })
    if (!account) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 })

    // Cannot modify a sold account's status — only username/password/extraInfo
    const data: Record<string, unknown> = {}
    if (parsed.data.username !== undefined) data.username = parsed.data.username
    if (parsed.data.password !== undefined) data.password = parsed.data.password
    if (parsed.data.extraInfo !== undefined) data.extraInfo = parsed.data.extraInfo
    if (parsed.data.status !== undefined && account.status !== 'sold') {
      data.status = parsed.data.status
    }

    const updated = await prisma.accountStock.update({
      where: { id: params.id },
      data,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('PATCH /api/admin/stock/[id] error:', error)
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const guard = guardObjectId(params.id)
  if (guard) return guard
  try {
    const account = await prisma.accountStock.findUnique({ where: { id: params.id } })
    if (!account) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 })

    if (account.status === 'sold') {
      // Soft-disable instead of delete — preserve audit trail
      await prisma.accountStock.update({
        where: { id: params.id },
        data: { status: 'disabled' },
      })
      return NextResponse.json({ message: 'Đã ẩn tài khoản (đã bán, không thể xóa)' })
    }

    await prisma.accountStock.delete({ where: { id: params.id } })
    return NextResponse.json({ message: 'Đã xóa tài khoản khỏi kho' })
  } catch (error) {
    console.error('DELETE /api/admin/stock/[id] error:', error)
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
