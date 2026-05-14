// Module-level store — persists in the Node.js process across requests.
// Use globalThis so hot-reload in dev doesn't reset the counter.
declare global {
  // eslint-disable-next-line no-var
  var _rlStore: Map<string, { count: number; resetAt: number }> | undefined
}

const store: Map<string, { count: number; resetAt: number }> =
  globalThis._rlStore ?? (globalThis._rlStore = new Map())

// Purge expired keys every 10 min to prevent unbounded growth
setInterval(() => {
  const now = Date.now()
  store.forEach((v, k) => {
    if (now > v.resetAt) store.delete(k)
  })
}, 10 * 60 * 1000).unref?.()

export interface RateLimitResult {
  allowed: boolean
  retryAfter: number // seconds until window resets
  remaining: number
}

/**
 * Sliding-window rate limiter.
 * @param key     Unique key, e.g. `login:${ip}` or `checkout:${ip}`
 * @param limit   Max requests allowed in windowMs
 * @param windowMs  Window length in milliseconds
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, retryAfter: 0, remaining: limit - 1 }
  }

  entry.count += 1

  if (entry.count > limit) {
    return {
      allowed: false,
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
      remaining: 0,
    }
  }

  return { allowed: true, retryAfter: 0, remaining: limit - entry.count }
}

export function getClientIp(request: Request): string {
  const fwd = request.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return 'unknown'
}

export function rateLimitResponse(retryAfter: number) {
  return Response.json(
    { error: `Quá nhiều yêu cầu. Vui lòng thử lại sau ${retryAfter} giây.` },
    {
      status: 429,
      headers: { 'Retry-After': String(retryAfter) },
    }
  )
}
