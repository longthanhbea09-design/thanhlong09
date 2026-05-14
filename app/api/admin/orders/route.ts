import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}

    if (status === 'unpaid') {
      where.paymentStatus = 'pending'
    } else if (status === 'paid') {
      where.paymentStatus = 'paid'
    } else if (status === 'completed') {
      where.status = 'completed'
    } else if (status === 'cancelled') {
      where.status = 'cancelled'
    } else if (status && status !== 'all') {
      where.status = status
    }

    if (search) {
      where.OR = [
        { orderCode: { contains: search } },
        { customerName: { contains: search } },
        { phone: { contains: search } },
      ]
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          product: { select: { name: true, icon: true } },
          plan: { select: { name: true, price: true, duration: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.order.count({ where }),
    ])

    return NextResponse.json({
      orders,
      total,
      pages: Math.ceil(total / limit),
      page,
    })
  } catch (error) {
    console.error('GET /api/admin/orders error:', error)
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
