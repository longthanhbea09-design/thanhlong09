import { NextResponse } from 'next/server'

// TODO: Tích hợp MoMo khi có tài khoản doanh nghiệp
// Env: MOMO_PARTNER_CODE, MOMO_ACCESS_KEY, MOMO_SECRET_KEY
export async function POST() {
  return NextResponse.json({ message: 'MoMo webhook endpoint - chưa tích hợp' }, { status: 501 })
}
