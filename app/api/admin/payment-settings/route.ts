import { NextRequest, NextResponse } from 'next/server'
import { getPaymentSettings, updatePaymentSettings } from '@/lib/payments/payment-settings'

export async function GET() {
  try {
    const s = await getPaymentSettings()
    // Never expose encrypted secrets — replace with boolean flags
    return NextResponse.json({
      activePaymentMethod: s.activePaymentMethod,
      momoEnabled: s.momoEnabled,
      momoMode: s.momoMode,
      momoPartnerCode: s.momoPartnerCode,
      momoAccessKey: s.momoAccessKey,
      momoHasSecret: !!s.momoSecretKeyEncrypted,
      momoEndpoint: s.momoEndpoint,
      momoReturnUrl: s.momoReturnUrl,
      momoIpnUrl: s.momoIpnUrl,
      mbBankEnabled: s.mbBankEnabled,
      mbBankName: s.mbBankName,
      mbBankBin: s.mbBankBin,
      mbBankAccountNumber: s.mbBankAccountNumber,
      mbBankAccountName: s.mbBankAccountName,
      mbBankPaymentContentPrefix: s.mbBankPaymentContentPrefix,
      mbBankQrProvider: s.mbBankQrProvider,
      mbBankAutoConfirmEnabled: s.mbBankAutoConfirmEnabled,
      sePayHasApiKey: !!s.sePayApiKeyEncrypted,
      sePayWebhookUrl: s.sePayWebhookUrl ?? null,
      autoDeliverAfterPaid: s.autoDeliverAfterPaid,
      allowManualConfirm: s.allowManualConfirm,
    })
  } catch (error) {
    console.error('GET /api/admin/payment-settings error:', error)
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()

    if (
      body.activePaymentMethod !== undefined &&
      !['MOMO', 'MB_BANK', 'DISABLED'].includes(body.activePaymentMethod)
    ) {
      return NextResponse.json(
        { error: 'activePaymentMethod phải là MOMO, MB_BANK hoặc DISABLED' },
        { status: 400 }
      )
    }

    // Extract raw secrets separately — never stored plain-text
    const { momoSecretKeyRaw, sePayApiKeyRaw, ...rest } = body

    await updatePaymentSettings({ ...rest, momoSecretKeyRaw, sePayApiKeyRaw })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('PATCH /api/admin/payment-settings error:', error)
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
