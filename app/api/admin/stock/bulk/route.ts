import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isValidObjectId } from '@/lib/db/real'
import { z } from 'zod'

const schema = z.object({
  ids: z
    .array(z.string().min(1))
    .min(1)
    .max(500)
    .refine((arr) => arr.every(isValidObjectId), { message: 'Một hoặc nhiều id không hợp lệ' }),
})

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 })
    }

    const { ids } = parsed.data

    // deleteMany handles sold records too — admin confirmed via modal
    // Order.deliveryContent is stored on the Order model and is unaffected
    const result = await prisma.accountStock.deleteMany({
      where: { id: { in: ids } },
    })

    console.log(`[stock bulk delete] deleted=${result.count}`)

    return NextResponse.json({ deleted: result.count })
  } catch (error) {
    console.error('DELETE /api/admin/stock/bulk error:', error)
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
