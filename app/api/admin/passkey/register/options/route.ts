import { NextResponse } from 'next/server'
import { generateRegistrationOptions } from '@simplewebauthn/server'
import { prisma } from '@/lib/prisma'
import { getAdminFromCookie } from '@/lib/auth'
import { saveChallenge, getRpId, RP_NAME } from '@/lib/webauthn'

export const dynamic = 'force-dynamic'

export async function POST() {
  const admin = await getAdminFromCookie()
  if (!admin) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })

  const adminId = admin.id as string

  // Collect existing credential IDs to exclude (prevent duplicate registration)
  const existing = await prisma.adminPasskey.findMany({
    where: { adminId },
    select: { credentialId: true, transports: true },
  })

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: getRpId(),
    userName: admin.email as string,
    userDisplayName: 'ThanhLong Admin',
    attestationType: 'none',
    excludeCredentials: existing.map((p) => ({
      id: p.credentialId,
      transports: p.transports
        ? (JSON.parse(p.transports) as AuthenticatorTransport[])
        : undefined,
    })),
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
      authenticatorAttachment: 'platform', // Touch ID / Face ID / Windows Hello
    },
  })

  // Store challenge keyed by adminId — consumed on verify
  saveChallenge(`reg:${adminId}`, options.challenge)

  return NextResponse.json(options)
}
