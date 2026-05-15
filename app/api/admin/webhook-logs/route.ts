import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/webhook-logs
 * Returns the 50 most recent webhook logs for admin visibility.
 * Protected by middleware JWT auth.
 *
 * Query params:
 *   ?provider=SEPAY   (filter by provider)
 *   ?status=AUTH_FAILED  (filter by status)
 *   ?limit=50
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const provider = searchParams.get('provider') ?? undefined
    const status = searchParams.get('status') ?? undefined
    const limit = Math.min(Number(searchParams.get('limit') ?? '50'), 200)

    const logs = await prisma.webhookLog.findMany({
      where: {
        ...(provider ? { provider } : {}),
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        provider: true,
        ip: true,
        authHeader: true,
        orderCode: true,
        amount: true,
        txId: true,
        status: true,
        message: true,
        createdAt: true,
        // rawBody intentionally omitted from list — use detail endpoint if needed
      },
    })

    return NextResponse.json({ logs, total: logs.length })
  } catch (error) {
    console.error('GET /api/admin/webhook-logs error:', error)
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
