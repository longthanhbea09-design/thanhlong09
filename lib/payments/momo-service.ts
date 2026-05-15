import { createHmac } from 'crypto'
import type { PaymentSettingsData } from './payment-settings'
import { getMomoSecretKey } from './payment-settings'

function hmac256(data: string, key: string): string {
  return createHmac('sha256', key).update(data).digest('hex')
}

interface MomoConfig {
  partnerCode: string
  accessKey: string
  secretKey: string
  endpoint: string
  ipnUrl: string
}

export async function getMomoConfig(settings: PaymentSettingsData): Promise<MomoConfig> {
  const secretKey = await getMomoSecretKey(settings)
  const endpoint = (
    settings.momoEndpoint ||
    process.env.MOMO_ENDPOINT ||
    'https://test-payment.momo.vn'
  ).replace(/\/$/, '')

  return {
    partnerCode: settings.momoPartnerCode || process.env.MOMO_PARTNER_CODE || '',
    accessKey: settings.momoAccessKey || process.env.MOMO_ACCESS_KEY || '',
    secretKey,
    endpoint,
    ipnUrl: settings.momoIpnUrl || process.env.MOMO_IPN_URL || '',
  }
}

export interface MomoPaymentResult {
  payUrl: string
  qrCodeUrl: string
  deeplink: string
  requestId: string
}

/**
 * Creates a MoMo payment using captureWallet (standard wallet payment).
 * Every order gets a unique requestId — MoMo deduplicates by this field.
 * returnUrl is the page MoMo redirects the customer to after payment (display only).
 * Actual fulfilment is triggered by IPN, never by returnUrl.
 */
export async function createMomoPayment(
  orderCode: string,
  amount: number,
  description: string,
  returnUrl: string,
  settings: PaymentSettingsData
): Promise<MomoPaymentResult> {
  const cfg = await getMomoConfig(settings)

  if (!cfg.partnerCode || !cfg.accessKey || !cfg.secretKey) {
    throw new Error('MoMo chưa cấu hình đủ: thiếu partnerCode, accessKey hoặc secretKey.')
  }
  if (!cfg.ipnUrl) {
    throw new Error('MoMo chưa cấu hình IPN URL.')
  }

  const orderId = orderCode
  const requestId = `${orderId}-${Date.now()}`
  const orderInfo = description.slice(0, 255)
  const requestType = 'captureWallet'
  const extraData = ''

  // Signature string must have fields sorted alphabetically — MoMo API v2 spec
  const rawHash = [
    `accessKey=${cfg.accessKey}`,
    `amount=${amount}`,
    `extraData=${extraData}`,
    `ipnUrl=${cfg.ipnUrl}`,
    `orderId=${orderId}`,
    `orderInfo=${orderInfo}`,
    `partnerCode=${cfg.partnerCode}`,
    `redirectUrl=${returnUrl}`,
    `requestId=${requestId}`,
    `requestType=${requestType}`,
  ].join('&')

  const signature = hmac256(rawHash, cfg.secretKey)

  const body = {
    partnerCode: cfg.partnerCode,
    accessKey: cfg.accessKey,
    requestId,
    amount,
    orderId,
    orderInfo,
    redirectUrl: returnUrl,
    ipnUrl: cfg.ipnUrl,
    extraData,
    requestType,
    signature,
    lang: 'vi',
  }

  const res = await fetch(`${cfg.endpoint}/v2/gateway/api/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) throw new Error(`MoMo API HTTP ${res.status}`)

  const data = (await res.json()) as {
    resultCode: number
    message: string
    payUrl?: string
    qrCodeUrl?: string
    deeplink?: string
  }

  if (data.resultCode !== 0) {
    throw new Error(`MoMo lỗi ${data.resultCode}: ${data.message}`)
  }

  return {
    payUrl: data.payUrl ?? '',
    qrCodeUrl: data.qrCodeUrl ?? '',
    deeplink: data.deeplink ?? '',
    requestId,
  }
}

export interface MomoIpnVerifyResult {
  valid: boolean
  orderCode?: string
  amount?: number
  transactionId?: string
  resultCode?: number
}

/**
 * Verifies a MoMo IPN payload using HMAC-SHA256.
 * secretKey and accessKey are passed explicitly so the caller
 * can supply them from DB or env without coupling to the env layer.
 */
export function verifyMomoIpn(
  payload: unknown,
  secretKey: string,
  accessKey: string
): MomoIpnVerifyResult {
  const p = payload as Record<string, unknown>

  const {
    partnerCode,
    orderId,
    requestId,
    amount,
    orderInfo,
    orderType,
    transId,
    resultCode,
    message,
    payType,
    responseTime,
    extraData,
    signature,
  } = p

  const rawHash = [
    `accessKey=${accessKey}`,
    `amount=${amount}`,
    `extraData=${extraData ?? ''}`,
    `message=${message ?? ''}`,
    `orderId=${orderId}`,
    `orderInfo=${orderInfo}`,
    `orderType=${orderType ?? ''}`,
    `partnerCode=${partnerCode}`,
    `payType=${payType ?? ''}`,
    `requestId=${requestId}`,
    `responseTime=${responseTime}`,
    `resultCode=${resultCode}`,
    `transId=${transId}`,
  ].join('&')

  const expected = hmac256(rawHash, secretKey)
  if (expected !== signature) return { valid: false }

  return {
    valid: true,
    orderCode: String(orderId),
    amount: Number(amount),
    transactionId: String(transId),
    resultCode: Number(resultCode),
  }
}
