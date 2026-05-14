import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { randomBytes } from 'crypto'
import path from 'path'
import { securityLog } from '@/lib/securityLog'
import { getClientIp } from '@/lib/rateLimit'

// SVG removed — can embed arbitrary scripts (XSS risk when served inline)
const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

const MAX_SIZE = 5 * 1024 * 1024 // 5 MB

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Không có file được gửi lên' }, { status: 400 })
    }

    // Validate MIME type — ignore client-supplied filename extension entirely
    const ext = ALLOWED_TYPES[file.type]
    if (!ext) {
      securityLog('UPLOAD_REJECTED', { ip, reason: 'invalid_mime', mime: file.type })
      return NextResponse.json(
        { error: 'Chỉ cho phép ảnh: jpg, png, webp, gif' },
        { status: 400 }
      )
    }

    if (file.size > MAX_SIZE) {
      securityLog('UPLOAD_REJECTED', { ip, reason: 'file_too_large', size: file.size })
      return NextResponse.json({ error: 'File quá lớn (tối đa 5MB)' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Filename is fully random — never uses anything from the original name
    const filename = `${Date.now()}-${randomBytes(8).toString('hex')}.${ext}`

    const uploadDir = path.join(process.cwd(), 'public', 'uploads')
    await mkdir(uploadDir, { recursive: true })
    await writeFile(path.join(uploadDir, filename), buffer)

    securityLog('UPLOAD_SUCCESS', { ip, filename, size: file.size, mime: file.type })

    return NextResponse.json({ url: `/uploads/${filename}` })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Lỗi server khi upload' }, { status: 500 })
  }
}
