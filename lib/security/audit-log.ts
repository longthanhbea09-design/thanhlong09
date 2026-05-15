/**
 * Persistent security audit log.
 *
 * Writes SecurityLog records to MongoDB (thanhlongshop.SecurityLog collection).
 * All writes are fire-and-forget — they never block the request/response cycle.
 *
 * Activated by: SECURITY_LOG_ENABLED=true in environment variables.
 * If disabled or if the DB write fails, errors are swallowed silently.
 *
 * Rules:
 * - NEVER log raw passwords, tokens, cookies, or API keys
 * - Truncate all user-derived strings to safe lengths before storage
 * - sanitizeMeta() strips any key that looks like a credential
 */
import { prisma } from '@/lib/prisma'

export type Severity = 'info' | 'warn' | 'critical'

export interface AuditEntry {
  event: string
  severity?: Severity
  ip?: string
  userAgent?: string
  path?: string
  method?: string
  reason?: string
  /** Additional structured context — credential-looking keys are auto-stripped */
  meta?: Record<string, string | number | boolean | null | undefined>
}

const REDACTED_KEYS = new Set([
  'password', 'passwordhash', 'passwd', 'pwd',
  'token', 'cookie', 'secret', 'key', 'hash',
  'authorization', 'apikey', 'api_key', 'accesstoken',
  'refreshtoken', 'privatekey',
])

function sanitizeMeta(obj: Record<string, unknown>): string {
  const clean = Object.fromEntries(
    Object.entries(obj).filter(([k]) => !REDACTED_KEYS.has(k.toLowerCase()))
  )
  return JSON.stringify(clean)
}

export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  if (process.env.SECURITY_LOG_ENABLED !== 'true') return
  try {
    await prisma.securityLog.create({
      data: {
        event: entry.event.slice(0, 100),
        severity: entry.severity ?? 'info',
        ip: entry.ip?.slice(0, 45),
        userAgent: entry.userAgent?.slice(0, 200),
        path: entry.path?.slice(0, 500),
        method: entry.method?.slice(0, 10),
        reason: entry.reason?.slice(0, 500),
        meta: entry.meta ? sanitizeMeta(entry.meta as Record<string, unknown>) : undefined,
      },
    })
  } catch {
    // Logging must never crash the application
  }
}

/** Non-blocking version — use this in request handlers. */
export function auditLog(entry: AuditEntry): void {
  writeAuditLog(entry).catch(() => {})
}
