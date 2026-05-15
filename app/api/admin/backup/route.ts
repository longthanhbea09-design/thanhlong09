/**
 * HONEYPOT endpoint — /api/admin/backup
 *
 * This path does not exist in the real API.
 * Attackers commonly probe backup endpoints to find exported data or configs.
 * Any access is logged; the response is a generic 404.
 */
import { NextRequest, NextResponse } from 'next/server'
import { securityLog } from '@/lib/securityLog'
import { getClientIp } from '@/lib/rateLimit'
import { logDecoyAccess } from '@/lib/db/decoy'

export const dynamic = 'force-dynamic'

function handle(request: NextRequest) {
  const ip = getClientIp(request)
  const ua = request.headers.get('user-agent') ?? ''

  securityLog('HONEYPOT_API_TRIGGERED', {
    ip,
    path: '/api/admin/backup',
    method: request.method,
    reason: 'backup_endpoint_honeypot',
    ua: ua.slice(0, 120),
  })

  logDecoyAccess({
    event: 'HONEYPOT_API_TRIGGERED',
    ip,
    path: '/api/admin/backup',
    method: request.method,
    userAgent: ua,
  })

  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}

export const GET = handle
export const POST = handle
export const PUT = handle
export const DELETE = handle
