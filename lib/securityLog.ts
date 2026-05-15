/**
 * Security event logger — dual-channel output:
 *   1. Console (always, synchronous, zero latency)
 *   2. MongoDB SecurityLog collection (async fire-and-forget, when SECURITY_LOG_ENABLED=true)
 *
 * Rules:
 * - NEVER log passwords, tokens, cookies, or raw API keys
 * - All payload values are run through sanitize() before any output
 * - DB writes are non-blocking and swallow their own errors
 */
import { writeAuditLog } from '@/lib/security/audit-log'

export type SecurityEvent =
  | 'ADMIN_LOGIN_SUCCESS'
  | 'ADMIN_LOGIN_FAILED'
  | 'ADMIN_LOGIN_RATE_LIMITED'
  | 'ADMIN_LOGOUT'
  | 'HONEYPOT_TRIGGERED'
  | 'HONEYPOT_API_TRIGGERED'
  | 'CHECKOUT_RATE_LIMITED'
  | 'PRODUCT_CREATED'
  | 'PRODUCT_UPDATED'
  | 'PRODUCT_DELETED'
  | 'VARIANT_UPDATED'
  | 'UPLOAD_SUCCESS'
  | 'UPLOAD_REJECTED'
  | 'ORDER_STATUS_UPDATED'
  | 'DELIVERY_UPDATED'
  | 'DELIVERY_EMAIL_RESENT'
  | 'SETTINGS_UPDATED'
  | 'UNAUTHORIZED_API_ACCESS'
  | 'WEBHOOK_SIGNATURE_INVALID'
  | 'PAYMENT_CONFIRMED'

type LogPayload = Record<string, string | number | boolean | null | undefined>

// Keys that must NEVER appear in any log output
const REDACTED_KEYS = new Set([
  'password', 'passwordhash', 'passwd', 'pwd',
  'token', 'cookie', 'secret', 'key', 'hash',
  'authorization', 'apikey', 'api_key', 'accesstoken',
])

function sanitize(payload: LogPayload): LogPayload {
  return Object.fromEntries(
    Object.entries(payload).filter(([k]) => !REDACTED_KEYS.has(k.toLowerCase()))
  )
}

const WARN_EVENTS: SecurityEvent[] = [
  'ADMIN_LOGIN_FAILED',
  'ADMIN_LOGIN_RATE_LIMITED',
  'HONEYPOT_TRIGGERED',
  'HONEYPOT_API_TRIGGERED',
  'CHECKOUT_RATE_LIMITED',
  'UPLOAD_REJECTED',
  'UNAUTHORIZED_API_ACCESS',
  'WEBHOOK_SIGNATURE_INVALID',
]

const CRITICAL_EVENTS: SecurityEvent[] = [
  'HONEYPOT_TRIGGERED',
  'HONEYPOT_API_TRIGGERED',
  'UNAUTHORIZED_API_ACCESS',
  'WEBHOOK_SIGNATURE_INVALID',
]

export function securityLog(event: SecurityEvent, payload: LogPayload = {}) {
  const clean = sanitize(payload)
  const severity: 'info' | 'warn' | 'critical' = CRITICAL_EVENTS.includes(event)
    ? 'critical'
    : WARN_EVENTS.includes(event)
    ? 'warn'
    : 'info'

  const line = JSON.stringify({ ts: new Date().toISOString(), event, ...clean })

  if (severity === 'warn' || severity === 'critical') {
    console.warn('[SECURITY]', line)
  } else {
    console.info('[AUDIT]', line)
  }

  // Persist to MongoDB — fire-and-forget, never blocks the response
  writeAuditLog({
    event,
    severity,
    ip: typeof clean.ip === 'string' ? clean.ip : undefined,
    userAgent: typeof clean.ua === 'string' ? clean.ua : undefined,
    path: typeof clean.path === 'string' ? clean.path : undefined,
    method: typeof clean.method === 'string' ? clean.method : undefined,
    reason: typeof clean.reason === 'string' ? clean.reason : undefined,
    meta: clean as Record<string, string | number | boolean | null | undefined>,
  }).catch(() => {})
}
