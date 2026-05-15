import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Public — returns only enabled ewallet payment methods (no admin secrets)
export async function GET() {
  try {
    const methods = await prisma.paymentMethod.findMany({
      where: { type: 'EWALLET', enabled: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        provider: true,
        name: true,
        accountNo: true,
        accountName: true,
        phone: true,
        qrImage: true,
        paymentUrl: true,
        transferNote: true,
        note: true,
      },
    })
    return NextResponse.json(methods)
  } catch (error) {
    console.error('GET /api/payment-methods error:', error)
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
