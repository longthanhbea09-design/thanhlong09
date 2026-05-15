import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGO = 'aes-256-gcm'
const IV_BYTES = 12 // 96-bit IV for GCM
const IV_HEX_LEN = IV_BYTES * 2 // 24 hex chars

function getKey(): Buffer | null {
  const raw = process.env.ENCRYPTION_KEY?.trim()
  if (!raw) return null
  // Accept 64-char hex (32 bytes) or base64-encoded (≥44 chars)
  if (/^[0-9a-f]{64}$/i.test(raw)) return Buffer.from(raw, 'hex')
  const b = Buffer.from(raw, 'base64')
  if (b.length >= 32) return b.slice(0, 32)
  console.error('[encryption] ENCRYPTION_KEY too short — need 32 bytes (64 hex or 44 base64 chars)')
  return null
}

/**
 * Encrypts plaintext using AES-256-GCM.
 * Output format: iv(hex):authTag(hex):ciphertext(hex)
 * Falls back to plaintext (with warning) if ENCRYPTION_KEY is not configured.
 */
export function encrypt(plaintext: string): string {
  const key = getKey()
  if (!key) {
    if (process.env.NODE_ENV !== 'test') {
      console.warn('[encryption] ENCRYPTION_KEY not set — storing data unencrypted. Set ENCRYPTION_KEY in .env')
    }
    return plaintext
  }
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALGO, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`
}

/**
 * Decrypts a value encrypted by encrypt().
 * If the value doesn't match the expected format (legacy plaintext or wrong key),
 * returns the raw value to prevent data loss.
 */
export function decrypt(value: string): string {
  if (!value) return value
  const parts = value.split(':')
  // Encrypted format: exactly 3 parts, first is IV (24 hex chars)
  if (parts.length !== 3 || parts[0].length !== IV_HEX_LEN) {
    return value // plaintext or unrecognized format — return as-is
  }
  const key = getKey()
  if (!key) return value // key not configured — can't decrypt, return raw
  try {
    const iv = Buffer.from(parts[0], 'hex')
    const tag = Buffer.from(parts[1], 'hex')
    const ct = Buffer.from(parts[2], 'hex')
    const decipher = createDecipheriv(ALGO, key, iv)
    decipher.setAuthTag(tag)
    return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8')
  } catch {
    // Wrong key or tampered data — return raw to avoid silent data loss
    return value
  }
}

/** Returns true if the value looks like an encrypted ciphertext from encrypt(). */
export function isEncrypted(value: string): boolean {
  const parts = value.split(':')
  return parts.length === 3 && parts[0].length === IV_HEX_LEN
}
