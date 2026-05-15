/**
 * Decoy / honeypot database layer.
 *
 * Points to thanhlongshop_decoy — a completely separate MongoDB database
 * that never contains real user data. Used only to record suspicious access
 * patterns from attackers who probe honeypot endpoints.
 *
 * This module is safe to import in honeypot handlers.
 * NEVER import it in normal business-logic routes.
 *
 * Activation: set DECOY_DATABASE_URL in environment variables.
 * If the env var is absent, all functions are no-ops.
 */
import { PrismaClient } from '@prisma/client'

const globalForDecoy = globalThis as unknown as { _decoy?: PrismaClient | null }

function buildDecoyClient(): PrismaClient | null {
  const url = process.env.DECOY_DATABASE_URL
  if (!url) return null
  try {
    return new PrismaClient({
      datasources: { db: { url } },
      log: ['error'],
    })
  } catch {
    return null
  }
}

// Reuse across hot-reloads in development; fresh instance per process in prod
const decoyPrisma: PrismaClient | null =
  process.env.NODE_ENV !== 'production'
    ? (globalForDecoy._decoy ?? (globalForDecoy._decoy = buildDecoyClient()))
    : buildDecoyClient()

export function isDecoyEnabled(): boolean {
  return decoyPrisma !== null
}

/**
 * Write a honeypot access record to the decoy database (fire-and-forget).
 * Input is sanitized before storage — never passes raw request body.
 */
export function logDecoyAccess(data: {
  event: string
  ip: string
  path: string
  method: string
  userAgent: string
}): void {
  if (!decoyPrisma) return

  // Sanitize all values — these come from request headers, not body
  const safe = {
    event: data.event.slice(0, 100),
    ip: data.ip.slice(0, 45),         // max IPv6 length
    path: data.path.slice(0, 500),
    method: data.method.slice(0, 10),
    ua: data.userAgent.slice(0, 200),
  }

  decoyPrisma.securityLog
    .create({
      data: {
        event: safe.event,
        severity: 'critical',
        ip: safe.ip,
        userAgent: safe.ua,
        path: safe.path,
        method: safe.method,
        reason: 'honeypot_access',
        meta: JSON.stringify({ decoy: true }),
      },
    })
    .catch(() => {
      // Decoy logging must never surface errors to callers
    })
}
