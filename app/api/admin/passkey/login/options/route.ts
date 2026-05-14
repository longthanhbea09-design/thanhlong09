import { NextResponse } from 'next/server'
import { generateAuthenticationOptions } from '@simplewebauthn/server'
import { prisma } from '@/lib/prisma'
import { saveChallenge, getRpId } from '@/lib/webauthn'

export const dynamic = 'force-dynamic'

// Public endpoint — no auth required (user is trying to log in)
export async function POST() {
  // Load all registered passkeys so the browser can select the right one
  const passkeys = await prisma.adminPasskey.findMany({
    select: { credentialId: true, transports: true },
  })

  const options = await generateAuthenticationOptions({
    rpID: getRpId(),
    userVerification: 'preferred',
    allowCredentials: passkeys.map((p) => ({
      id: p.credentialId,
      transports: p.transports
        ? (JSON.parse(p.transports) as AuthenticatorTransport[])
        : undefined,
    })),
  })

  // Challenge keyed by a fixed key — only one login ceremony at a time per server
  // For multi-user admin setups, use session ID instead
  saveChallenge('login:admin', options.challenge)

  return NextResponse.json(options)
}
