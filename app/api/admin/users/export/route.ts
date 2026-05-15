/**
 * HONEYPOT endpoint — /api/admin/users/export
 *
 * This path does not exist in the real API.
 * Any access (even with a valid admin token) is logged as suspicious
 * because legitimate admin code never calls this endpoint.
 *
 * Returns a generic 404 to avoid revealing monitoring.
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
    path: '/api/admin/users/export',
    method: request.method,
    reason: 'user_export_honeypot',
    ua: ua.slice(0, 120),
  })

  logDecoyAccess({
    event: 'HONEYPOT_API_TRIGGERED',
    ip,
    path: '/api/admin/users/export',
    method: request.method,
    userAgent: ua,
  })

  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}

export const GET = handle
export const POST = handle
export const PUT = handle
export const DELETE = handle
