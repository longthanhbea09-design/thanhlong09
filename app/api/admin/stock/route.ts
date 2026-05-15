import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { encrypt, decrypt } from '@/lib/security/encryption'

const bulkImportSchema = z.object({
  productId: z.string().min(1),
  planId: z.string().min(1),
  // Each line: "username|password" or "username|password|extraInfo"
  // extraInfo may contain "|" — only the first two "|" are delimiters
  lines: z.array(z.string()).min(1).max(500),
})

/**
 * Parse a single import line.
 * Splits ONLY on the first two `|` so that passwords or notes may contain `|`.
 * Returns null when the line has no `|` (missing password separator).
 */
function parseLine(raw: string): { username: string; password: string; extraInfo: string } | null {
  const line = raw.trim()
  if (!line || line.startsWith('#')) return null

  const firstPipe = line.indexOf('|')
  if (firstPipe === -1) return null

  const username = line.slice(0, firstPipe).trim()
  const afterUsername = line.slice(firstPipe + 1)

  const secondPipe = afterUsername.indexOf('|')
  if (secondPipe === -1) {
    const password = afterUsername.trim()
    if (!username || !password) return null
    return { username, password, extraInfo: '' }
  }

  const password = afterUsername.slice(0, secondPipe).trim()
  const extraInfo = afterUsername.slice(secondPipe + 1).trim()

  if (!username || !password) return null
  return { username, password, extraInfo }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId') || undefined
    const planId = searchParams.get('planId') || undefined
    const status = searchParams.get('status') || undefined
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = 50

    const where = {
      ...(productId ? { productId } : {}),
      ...(planId ? { planId } : {}),
      ...(status ? { status } : {}),
    }

    const [items, total] = await Promise.all([
      prisma.accountStock.findMany({
        where,
        include: {
          product: { select: { id: true, name: true, icon: true } },
          plan: { select: { id: true, name: true, price: true } },
          order: { select: { orderCode: true, customerName: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.accountStock.count({ where }),
    ])

    // Decrypt password and extraInfo before returning to admin
    const decryptedItems = items.map(item => ({
      ...item,
      password: decrypt(item.password),
      extraInfo: item.extraInfo ? decrypt(item.extraInfo) : item.extraInfo,
    }))

    return NextResponse.json({ items: decryptedItems, total, page, limit })
  } catch (error) {
    console.error('GET /api/admin/stock error:', error)
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const schema = bulkImportSchema.safeParse(body)
    if (!schema.success) {
      return NextResponse.json(
        { error: 'Dữ liệu không hợp lệ', details: schema.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { productId, planId, lines } = schema.data

    // Verify product+plan exist and belong together
    const plan = await prisma.productPlan.findFirst({
      where: { id: planId, productId },
      include: { product: { select: { name: true } } },
    })
    if (!plan) {
      return NextResponse.json(
        { error: `Không tìm thấy gói planId="${planId}" trong sản phẩm productId="${productId}". Kiểm tra lại lựa chọn.` },
        { status: 404 }
      )
    }

    // Collect usernames already in DB for this product+plan (for duplicate detection)
    const existingRows = await prisma.accountStock.findMany({
      where: { productId, planId },
      select: { username: true },
    })
    const existingUsernames = new Set(existingRows.map((r) => r.username.toLowerCase()))

    const errors: { line: number; raw: string; reason: string }[] = []
    const valid: { username: string; password: string; extraInfo: string }[] = []
    const seenInBatch = new Set<string>()

    lines.forEach((raw, idx) => {
      const lineNum = idx + 1
      const trimmed = raw.trim()

      if (!trimmed || trimmed.startsWith('#')) return

      const parsed = parseLine(trimmed)
      if (!parsed) {
        errors.push({ line: lineNum, raw: trimmed, reason: 'Thiếu dấu | giữa username và password' })
        return
      }

      const { username, password, extraInfo } = parsed

      if (!username) {
        errors.push({ line: lineNum, raw: trimmed, reason: 'Username trống' })
        return
      }
      if (!password) {
        errors.push({ line: lineNum, raw: trimmed, reason: 'Password trống' })
        return
      }

      const key = username.toLowerCase()

      if (seenInBatch.has(key)) {
        errors.push({ line: lineNum, raw: trimmed, reason: `Trùng username trong lần import này: ${username}` })
        return
      }
      if (existingUsernames.has(key)) {
        errors.push({ line: lineNum, raw: trimmed, reason: `Username đã tồn tại trong kho: ${username}` })
        return
      }

      seenInBatch.add(key)
      valid.push({ username, password, extraInfo })
    })

    let importedCount = 0
    for (const row of valid) {
      try {
        await prisma.accountStock.create({
          data: {
            productId,
            planId,
            username: row.username,
            password: encrypt(row.password),     // encrypt before storing
            extraInfo: encrypt(row.extraInfo),   // encrypt extraInfo too
            status: 'available',
          },
        })
        importedCount++
      } catch (dbErr) {
        const msg = dbErr instanceof Error ? dbErr.message : String(dbErr)
        errors.push({ line: -1, raw: row.username, reason: `Lỗi DB: ${msg}` })
        console.error(`[stock import] DB insert failed for username="${row.username}":`, msg)
      }
    }

    console.log(
      `[stock import] product=${plan.product.name} plan=${plan.name} ` +
      `imported=${importedCount} skipped=${errors.length}`
    )

    return NextResponse.json(
      {
        success: true,
        imported: importedCount,
        skipped: errors.length,
        errors,
      },
      { status: importedCount > 0 ? 201 : 400 }
    )
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('POST /api/admin/stock error:', msg)
    return NextResponse.json({ error: `Lỗi server: ${msg}` }, { status: 500 })
  }
}
