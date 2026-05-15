import { prisma } from '@/lib/prisma'
import { encrypt, decrypt, isEncrypted } from '@/lib/security/encryption'

export const PAYMENT_SETTINGS_ID = 'main'

export type ActivePaymentMethod = 'MOMO' | 'MB_BANK' | 'DISABLED'

export interface PaymentSettingsData {
  id: string
  activePaymentMethod: string
  momoEnabled: boolean
  momoMode: string
  momoPartnerCode: string | null
  momoAccessKey: string | null
  momoSecretKeyEncrypted: string | null
  momoEndpoint: string | null
  momoReturnUrl: string | null
  momoIpnUrl: string | null
  mbBankEnabled: boolean
  mbBankName: string
  mbBankBin: string | null
  mbBankAccountNumber: string | null
  mbBankAccountName: string | null
  mbBankPaymentContentPrefix: string
  mbBankQrProvider: string
  mbBankAutoConfirmEnabled: boolean
  sePayApiKeyEncrypted: string | null
  sePayWebhookUrl: string | null
  autoDeliverAfterPaid: boolean
  allowManualConfirm: boolean
}

const DEFAULTS: PaymentSettingsData = {
  id: PAYMENT_SETTINGS_ID,
  activePaymentMethod: 'MB_BANK',
  momoEnabled: false,
  momoMode: 'sandbox',
  momoPartnerCode: null,
  momoAccessKey: null,
  momoSecretKeyEncrypted: null,
  momoEndpoint: null,
  momoReturnUrl: null,
  momoIpnUrl: null,
  mbBankEnabled: true,
  mbBankName: 'MB Bank',
  mbBankBin: null,
  mbBankAccountNumber: null,
  mbBankAccountName: null,
  mbBankPaymentContentPrefix: 'THANHLONG',
  mbBankQrProvider: 'vietqr',
  mbBankAutoConfirmEnabled: false,
  sePayApiKeyEncrypted: null,
  sePayWebhookUrl: null,
  autoDeliverAfterPaid: true,
  allowManualConfirm: true,
}

export async function getPaymentSettings(): Promise<PaymentSettingsData> {
  const s = await prisma.paymentSettings.findFirst()
  return (s as PaymentSettingsData | null) ?? DEFAULTS
}

/**
 * Returns the MoMo HMAC secret key.
 * Priority: encrypted value from DB → MOMO_SECRET_KEY env var.
 * Never logged.
 */
export async function getMomoSecretKey(settings?: PaymentSettingsData): Promise<string> {
  const s = settings ?? await getPaymentSettings()
  if (s.momoSecretKeyEncrypted) {
    const decrypted = decrypt(s.momoSecretKeyEncrypted)
    // Guard: if ENCRYPTION_KEY is missing on this host, decrypt() returns the raw
    // iv:tag:ciphertext string instead of the plaintext — don't use it as the key.
    if (decrypted && !isEncrypted(decrypted)) return decrypted
  }
  return process.env.MOMO_SECRET_KEY ?? ''
}

/**
 * Returns the SePay webhook API key.
 * Priority: encrypted value from DB → SEPAY_API_KEY env var.
 * Never logged.
 */
export async function getSePayApiKey(settings?: PaymentSettingsData): Promise<string> {
  const s = settings ?? await getPaymentSettings()
  if (s.sePayApiKeyEncrypted) {
    const decrypted = decrypt(s.sePayApiKeyEncrypted)
    // Guard: if ENCRYPTION_KEY is missing on this host, decrypt() returns the raw
    // iv:tag:ciphertext string instead of the plaintext — don't use it as the key.
    if (decrypted && !isEncrypted(decrypted)) return decrypted
  }
  return process.env.SEPAY_API_KEY ?? ''
}

/**
 * Builds the VietQR URL for MB Bank transfers.
 * Returns null if MB Bank is not configured.
 */
export function buildMbBankQrUrl(
  settings: PaymentSettingsData,
  amount: number,
  paymentContent: string
): string | null {
  if (!settings.mbBankBin || !settings.mbBankAccountNumber) return null
  const params = new URLSearchParams({
    amount: Math.round(amount).toString(),
    addInfo: paymentContent,
    accountName: settings.mbBankAccountName ?? '',
  })
  return `https://img.vietqr.io/image/${settings.mbBankBin}-${settings.mbBankAccountNumber}-compact2.png?${params}`
}

/**
 * Builds the transfer content string for MB Bank orders.
 * Example: "THANHLONG ORD20260515123456"
 */
export function buildMbBankPaymentContent(settings: PaymentSettingsData, orderCode: string): string {
  const prefix = settings.mbBankPaymentContentPrefix?.trim() || 'THANHTOAN'
  return `${prefix} ${orderCode}`
}

interface UpdateInput extends Partial<PaymentSettingsData> {
  momoSecretKeyRaw?: string  // plain-text secret to encrypt before saving
  sePayApiKeyRaw?: string    // plain-text SePay API key to encrypt before saving
}

// Minimum required fields for a new PaymentSettings document (no optional nulls)
const CREATE_DEFAULTS = {
  activePaymentMethod: 'MB_BANK',
  momoEnabled: false,
  momoMode: 'sandbox',
  mbBankEnabled: true,
  mbBankName: 'MB Bank',
  mbBankPaymentContentPrefix: 'THANHLONG',
  mbBankQrProvider: 'vietqr',
  mbBankAutoConfirmEnabled: false,
  autoDeliverAfterPaid: true,
  allowManualConfirm: true,
} as const

export async function updatePaymentSettings(data: UpdateInput): Promise<PaymentSettingsData> {
  const { momoSecretKeyRaw, sePayApiKeyRaw, id: _id, ...rest } = data

  // Only include keys that exist in the Prisma schema — no extras, no nulls for unknown fields
  const ALLOWED_KEYS = new Set([
    'activePaymentMethod', 'momoEnabled', 'momoMode', 'momoPartnerCode',
    'momoAccessKey', 'momoEndpoint', 'momoReturnUrl', 'momoIpnUrl',
    'mbBankEnabled', 'mbBankName', 'mbBankBin', 'mbBankAccountNumber',
    'mbBankAccountName', 'mbBankPaymentContentPrefix', 'mbBankQrProvider',
    'mbBankAutoConfirmEnabled', 'sePayWebhookUrl',
    'autoDeliverAfterPaid', 'allowManualConfirm',
  ])

  const update: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(rest)) {
    if (ALLOWED_KEYS.has(k)) update[k] = v
  }

  if (momoSecretKeyRaw !== undefined) {
    update.momoSecretKeyEncrypted = momoSecretKeyRaw ? encrypt(momoSecretKeyRaw) : null
  }

  if (sePayApiKeyRaw !== undefined) {
    update.sePayApiKeyEncrypted = sePayApiKeyRaw ? encrypt(sePayApiKeyRaw) : null
  }

  const result = await prisma.paymentSettings.upsert({
    where: { id: PAYMENT_SETTINGS_ID },
    update,
    create: { id: PAYMENT_SETTINGS_ID, ...CREATE_DEFAULTS, ...update },
  })
  return result as PaymentSettingsData
}
