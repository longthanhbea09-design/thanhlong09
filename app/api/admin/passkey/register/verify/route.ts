import { NextRequest, NextResponse } from 'next/server'
import { verifyRegistrationResponse } from '@simplewebauthn/server'
import { prisma } from '@/lib/prisma'
import { getAdminFromCookie } from '@/lib/auth'
import { consumeChallenge, getRpId, getExpectedOrigin } from '@/lib/webauthn'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const admin = await getAdminFromCookie()
  if (!admin) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })

  const adminId = admin.id as string

  const challenge = consumeChallenge(`reg:${adminId}`)
  if (!challenge) {
    return NextResponse.json({ error: 'Challenge hết hạn, thử lại.' }, { status: 400 })
  }

  try {
    const body = await request.json()
    const deviceName: string = body.deviceName || 'MacBook Touch ID'

    const verification = await verifyRegistrationResponse({
      response: body.credential,
      expectedChallenge: challenge,
      expectedOrigin: getExpectedOrigin(),
      expectedRPID: getRpId(),
      requireUserVerification: true,
    })

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json({ error: 'Xác minh thất bại.' }, { status: 400 })
    }

    const { credential, credentialDeviceType, credentialBackedUp } =
      verification.registrationInfo

    // credentialID is a Uint8Array in v13 — store as base64url string
    const credentialId = Buffer.from(credential.id).toString('base64url')
    const publicKeyBytes = Buffer.from(credential.publicKey)

    await prisma.adminPasskey.create({
      data: {
        adminId,
        credentialId,
        publicKey: publicKeyBytes,
        counter: BigInt(credential.counter),
        transports: body.credential.response.transports
          ? JSON.stringify(body.credential.response.transports)
          : null,
        deviceName,
      },
    })

    console.info('[PASSKEY] Registered new passkey', {
      adminId,
      credentialId: credentialId.slice(0, 16),
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
    })

    return NextResponse.json({ success: true, deviceName })
  } catch (error) {
    console.error('[PASSKEY] register/verify error:', error)
    return NextResponse.json({ error: 'Lỗi xác minh passkey.' }, { status: 500 })
  }
}
