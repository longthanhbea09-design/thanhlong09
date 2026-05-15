import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { securityLog } from '@/lib/securityLog'
import { getClientIp } from '@/lib/rateLimit'
import { uploadBuffer } from '@/lib/cloudinary'

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

    // public_id is fully random — never uses anything from the original filename
    const publicId = `${Date.now()}-${randomBytes(8).toString('hex')}`

    const { secure_url } = await uploadBuffer(buffer, {
      folder: 'thanhlongshop/products',
      public_id: publicId,
      resource_type: 'image',
    })

    securityLog('UPLOAD_SUCCESS', { ip, size: file.size, mime: file.type })

    return NextResponse.json({ success: true, url: secure_url })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Lỗi server khi upload' }, { status: 500 })
  }
}
