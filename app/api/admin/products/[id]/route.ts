import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { productSchema } from '@/lib/validators'
import { securityLog } from '@/lib/securityLog'
import { getClientIp } from '@/lib/rateLimit'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const parsed = productSchema.partial().safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dữ liệu không hợp lệ', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const product = await prisma.product.update({
      where: { id: params.id },
      data: parsed.data,
      include: { plans: true },
    })
    securityLog('PRODUCT_UPDATED', { ip: getClientIp(request), productId: params.id })
    return NextResponse.json(product)
  } catch (error) {
    console.error('PATCH /api/admin/products/[id] error:', error)
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const hasOrders = await prisma.order.findFirst({ where: { productId: params.id } })
    if (hasOrders) {
      await prisma.product.update({
        where: { id: params.id },
        data: { isActive: false },
      })
      return NextResponse.json({ success: true, message: 'Sản phẩm đã được ẩn (có đơn hàng liên quan)' })
    }

    await prisma.product.delete({ where: { id: params.id } })
    securityLog('PRODUCT_DELETED', { ip: getClientIp(_request), productId: params.id })
    return NextResponse.json({ success: true, message: 'Đã xóa sản phẩm' })
  } catch (error) {
    console.error('DELETE /api/admin/products/[id] error:', error)
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
