import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthenticationResponse } from '@simplewebauthn/server'
import { prisma } from '@/lib/prisma'
import { signToken, COOKIE_NAME } from '@/lib/auth'
import { consumeChallenge, getRpId, getExpectedOrigin } from '@/lib/webauthn'
import { getClientIp } from '@/lib/rateLimit'
import { securityLog } from '@/lib/securityLog'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)

  const challenge = consumeChallenge('login:admin')
  if (!challenge) {
    return NextResponse.json({ error: 'Challenge hết hạn, thử lại.' }, { status: 400 })
  }

  try {
    const body = await request.json()
    const assertionCredentialId: string = body.id

    // Find the matching passkey in DB
    const passkey = await prisma.adminPasskey.findUnique({
      where: { credentialId: assertionCredentialId },
      include: { admin: true },
    })

    if (!passkey) {
      securityLog('ADMIN_LOGIN_FAILED', { ip, reason: 'passkey_not_found' })
      return NextResponse.json({ error: 'Passkey không hợp lệ.' }, { status: 401 })
    }

    const verification = await verifyAuthenticationResponse({
      response: body,
      expectedChallenge: challenge,
      expectedOrigin: getExpectedOrigin(),
      expectedRPID: getRpId(),
      requireUserVerification: true,
      credential: {
        id: passkey.credentialId,
        publicKey: new Uint8Array(passkey.publicKey),
        counter: Number(passkey.counter),
        transports: passkey.transports
          ? (JSON.parse(passkey.transports) as AuthenticatorTransport[])
          : undefined,
      },
    })

    if (!verification.verified) {
      securityLog('ADMIN_LOGIN_FAILED', { ip, reason: 'passkey_verify_failed' })
      return NextResponse.json({ error: 'Xác minh Touch ID thất bại.' }, { status: 401 })
    }

    // Update counter (prevents replay attacks) and lastUsedAt
    await prisma.adminPasskey.update({
      where: { id: passkey.id },
      data: {
        counter: BigInt(verification.authenticationInfo.newCounter),
        lastUsedAt: new Date(),
      },
    })

    const admin = passkey.admin
    const token = await signToken(
      { id: admin.id, email: admin.email, role: admin.role },
      '1d'
    )

    securityLog('ADMIN_LOGIN_SUCCESS', { ip, email: admin.email, method: 'passkey' })

    const response = NextResponse.json({ success: true })
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('[PASSKEY] login/verify error:', error)
    return NextResponse.json({ error: 'Lỗi xác minh.' }, { status: 500 })
  }
}
