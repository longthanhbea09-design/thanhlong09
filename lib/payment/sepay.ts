/**
 * SePay webhook verification helpers.
 *
 * Authorization header format: "Apikey YOUR_API_KEY"
 * OrderCode format: TLS-YYYYMMDD-XXXX
 *
 * Two-step verification:
 *   1. checkSePayAuth()  — verifies the API key in the Authorization header.
 *      Call this first; return 401 immediately if it fails.
 *   2. parseSePayPayload() — validates payload fields and extracts orderCode.
 *      Only call after auth passes. Failures here are benign skips (return 200).
 */

export interface SePayPayload {
  id: string | number
  gateway: string
  transactionDate: string
  accountNumber: string
  code: string | null
  content: string
  transferType: string         // "in" | "out"
  transferAmount: number
  referenceCode: string | null
  description: string
}

export interface SePayParseResult {
  ok: boolean
  orderCode?: string
  amount?: number
  transactionId?: string
  referenceCode?: string
  skipReason?: string
}

// Matches TLS-YYYYMMDD-XXXX (our orderCode format from generateOrderCode())
const ORDER_CODE_RE = /TLS-\d{8}-\d{4}/i

/**
 * Step 1 — Auth check.
 * Returns true only when the Authorization header exactly matches "Apikey <apiKey>".
 * apiKey is loaded server-side from DB (encrypted) or SEPAY_API_KEY env var.
 * Never log apiKey.
 */
export function checkSePayAuth(
  authorizationHeader: string | null,
  apiKey: string
): boolean {
  if (!apiKey) return false
  return authorizationHeader === `Apikey ${apiKey}`
}

/**
 * Step 2 — Payload parse (call only after auth passes).
 * Returns ok=false with a skipReason for benign cases (out transfer, no orderCode).
 * Caller should return HTTP 200 on skip — these are normal SePay events we don't handle.
 */
export function parseSePayPayload(payload: unknown): SePayParseResult {
  const p = payload as SePayPayload

  if (p.transferType !== 'in') {
    return { ok: false, skipReason: `transferType="${p.transferType}"` }
  }

  // Search content, code, then description — SePay may put orderCode in any of these
  const sources = [p.content, p.code, p.description].filter(Boolean).join(' ')
  const match = sources.match(ORDER_CODE_RE)
  if (!match) {
    return { ok: false, skipReason: 'orderCode not found in content/code/description' }
  }

  return {
    ok: true,
    orderCode: match[0].toUpperCase(),
    amount: p.transferAmount,
    transactionId: String(p.id),
    referenceCode: p.referenceCode ?? undefined,
  }
}
