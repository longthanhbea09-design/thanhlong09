export type SecurityEvent =
  | 'ADMIN_LOGIN_SUCCESS'
  | 'ADMIN_LOGIN_FAILED'
  | 'ADMIN_LOGIN_RATE_LIMITED'
  | 'ADMIN_LOGOUT'
  | 'HONEYPOT_TRIGGERED'
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

type LogPayload = Record<string, string | number | boolean | null | undefined>

// Fields that must NEVER appear in logs
const REDACTED_KEYS = new Set([
  'password', 'passwordhash', 'token', 'cookie', 'secret',
  'key', 'hash', 'authorization', 'apikey', 'api_key',
])

function sanitize(payload: LogPayload): LogPayload {
  return Object.fromEntries(
    Object.entries(payload).filter(
      ([k]) => !REDACTED_KEYS.has(k.toLowerCase())
    )
  )
}

const WARN_EVENTS: SecurityEvent[] = [
  'ADMIN_LOGIN_FAILED',
  'ADMIN_LOGIN_RATE_LIMITED',
  'HONEYPOT_TRIGGERED',
  'CHECKOUT_RATE_LIMITED',
  'UPLOAD_REJECTED',
  'UNAUTHORIZED_API_ACCESS',
]

export function securityLog(event: SecurityEvent, payload: LogPayload = {}) {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    event,
    ...sanitize(payload),
  })

  if (WARN_EVENTS.includes(event)) {
    console.warn('[SECURITY]', line)
  } else {
    console.info('[AUDIT]', line)
  }
}
