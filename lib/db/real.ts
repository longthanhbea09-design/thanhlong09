/**
 * Real database access layer.
 *
 * Re-exports the production Prisma client and provides ObjectId validation
 * helpers. All API routes should import prisma from here rather than
 * lib/prisma.ts directly, so ObjectId guards are one import away.
 *
 * DATABASE_URL must NEVER have the NEXT_PUBLIC_ prefix.
 * It is set only in Vercel Environment Variables (server-only).
 */
export { prisma } from '@/lib/prisma'

const OID_RE = /^[a-f\d]{24}$/i

/** Returns true if `id` is a valid 24-hex-char MongoDB ObjectId string. */
export function isValidObjectId(id: string): boolean {
  return OID_RE.test(id)
}

/**
 * Call at the start of any route handler that receives a MongoDB ObjectId
 * from URL params. Returns a ready-made 400 Response if the id is malformed,
 * or null if it is valid and safe to query.
 *
 * @example
 * const guard = guardObjectId(params.id)
 * if (guard) return guard
 */
export function guardObjectId(id: string, fieldName = 'id'): Response | null {
  if (!OID_RE.test(id)) {
    return Response.json(
      { error: `${fieldName} không hợp lệ` },
      { status: 400 }
    )
  }
  return null
}

/**
 * Validate multiple ObjectId params in one call.
 * Returns a 400 Response on the first invalid id, or null if all valid.
 *
 * @example
 * const guard = guardObjectIds({ productId: params.id, planId: params.variantId })
 * if (guard) return guard
 */
export function guardObjectIds(ids: Record<string, string>): Response | null {
  for (const [name, value] of Object.entries(ids)) {
    const r = guardObjectId(value, name)
    if (r) return r
  }
  return null
}
