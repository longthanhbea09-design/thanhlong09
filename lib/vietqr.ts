export interface VietQRParams {
  bankBin: string
  bankAccount: string
  amount: number
  addInfo: string
  accountName?: string
}

/**
 * Generates a VietQR image URL (img.vietqr.io) for bank transfer.
 * bankBin: bank BIN code (e.g. "970422" for MB Bank, "970436" for Vietcombank)
 * addInfo: transfer content (order code)
 */
export function getVietQRUrl({ bankBin, bankAccount, amount, addInfo, accountName = '' }: VietQRParams): string {
  const params = new URLSearchParams({
    amount: Math.round(amount).toString(),
    addInfo,
    accountName,
  })
  return `https://img.vietqr.io/image/${bankBin}-${bankAccount}-compact2.png?${params.toString()}`
}

/** Common Vietnamese bank BINs for the admin UI */
export const VIET_BANKS = [
  { name: 'MB Bank', bin: '970422' },
  { name: 'Vietcombank (VCB)', bin: '970436' },
  { name: 'Techcombank (TCB)', bin: '970407' },
  { name: 'BIDV', bin: '970418' },
  { name: 'Agribank (AGB)', bin: '970405' },
  { name: 'VPBank', bin: '970432' },
  { name: 'TPBank', bin: '970423' },
  { name: 'ACB', bin: '970416' },
  { name: 'Sacombank (STB)', bin: '970403' },
  { name: 'VietinBank (CTG)', bin: '970415' },
  { name: 'HDBank', bin: '970437' },
  { name: 'OCB', bin: '970448' },
  { name: 'MSB', bin: '970426' },
  { name: 'SHB', bin: '970443' },
  { name: 'SeABank', bin: '970440' },
  { name: 'Eximbank', bin: '970431' },
]
