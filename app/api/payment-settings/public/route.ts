/**
 * GET /api/payment-settings/public
 *
 * Returns only the fields a customer needs to display payment info.
 * Never returns secrets (API keys, tokens, encrypted values).
 */
import { NextResponse } from 'next/server'
import { getPaymentSettings } from '@/lib/payments/payment-settings'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const s = await getPaymentSettings()

    return NextResponse.json({
      isEnabled: s.activePaymentMethod !== 'DISABLED',
      paymentMethod: s.activePaymentMethod,
      bank: {
        bankName: s.mbBankName,
        bankBin: s.mbBankBin,
        accountNumber: s.mbBankAccountNumber,
        accountName: s.mbBankAccountName,
        paymentPrefix: s.mbBankPaymentContentPrefix,
        qrProvider: s.mbBankQrProvider,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Không thể tải cấu hình thanh toán' }, { status: 500 })
  }
}
