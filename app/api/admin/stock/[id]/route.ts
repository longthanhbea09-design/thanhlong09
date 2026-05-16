import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { guardObjectId } from '@/lib/db/real'
import { encrypt } from '@/lib/security/encryption'

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

    const data: Record<string, unknown> = {}
    if (parsed.data.username !== undefined) data.username = parsed.data.username
    // Encrypt password and extraInfo before storing (if provided)
    if (parsed.data.password !== undefined) data.password = encrypt(parsed.data.password)
    if (parsed.data.extraInfo !== undefined) data.extraInfo = encrypt(parsed.data.extraInfo)
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
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const guard = guardObjectId(params.id)
  if (guard) return guard
  try {
    const force = new URL(request.url).searchParams.get('force') === 'true'

    const account = await prisma.accountStock.findUnique({ where: { id: params.id } })
    if (!account) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 })

    if (account.status === 'sold') {
      if (!force) {
        return NextResponse.json(
          { error: 'Tài khoản đã bán. Dùng force=true để xóa bản ghi này (chỉ dùng cho test/nhập lại kho). Thông tin bàn giao của đơn hàng liên quan không bị ảnh hưởng.' },
          { status: 409 }
        )
      }
      // force=true: delete the sold record
      // Order.deliveryContent is stored independently on the Order model and is unaffected
      await prisma.accountStock.delete({ where: { id: params.id } })
      console.log(`[stock] Admin force-deleted sold account id=${params.id} username=${account.username}`)
      return NextResponse.json({ message: 'Đã xóa bản ghi tài khoản đã bán. Thông tin bàn giao của đơn hàng không bị ảnh hưởng.' })
    }

    await prisma.accountStock.delete({ where: { id: params.id } })
    return NextResponse.json({ message: 'Đã xóa tài khoản khỏi kho' })
  } catch (error) {
    console.error('DELETE /api/admin/stock/[id] error:', error)
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
