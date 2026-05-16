import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function maskCustomerName(name: string): string {
  if (!name?.trim()) return 'Khách ẩn danh'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0] + '***'
  if (parts.length === 2) return parts[0] + ' ' + parts[1][0] + '***'
  // 3+ parts: Nguyễn V*** A
  return parts[0] + ' ' + parts[1][0] + '*** ' + parts[parts.length - 1][0]
}

export async function GET() {
  try {
    const orders = await prisma.order.findMany({
      where: { paymentStatus: 'paid' },
      select: {
        customerName: true,
        product: { select: { name: true } },
        status: true,
        deliveryStatus: true,
        paymentStatus: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 3,
    })

    const result = orders.map((o) => ({
      name: maskCustomerName(o.customerName),
      product: o.product.name,
      status:
        o.deliveryStatus === 'delivered' || o.status === 'completed'
          ? 'Hoàn thành'
          : o.paymentStatus === 'paid'
          ? 'Đang xử lý'
          : 'Mới',
    }))

    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'public, s-maxage=7200, stale-while-revalidate=3600' },
    })
  } catch {
    return NextResponse.json([])
  }
}
