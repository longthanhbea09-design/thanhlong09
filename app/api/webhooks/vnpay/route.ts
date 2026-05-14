import { NextResponse } from 'next/server'

// TODO: Tích hợp VNPay khi có tài khoản merchant
// Env: VNPAY_TMN_CODE, VNPAY_HASH_SECRET
export async function POST() {
  return NextResponse.json({ message: 'VNPay webhook endpoint - chưa tích hợp' }, { status: 501 })
}
