import nodemailer from 'nodemailer'
import { formatPrice } from './utils'

function createTransporter() {
  const host = process.env.SMTP_HOST
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (!host || !user || !pass) return null

  return nodemailer.createTransport({
    host,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_PORT === '465',
    auth: { user, pass },
  })
}

function orderEmailHtml(vars: {
  orderCode: string
  productName: string
  variantName: string
  amount: number
  customerName: string
  customerEmail: string
  deliveryContent: string
  lookupUrl: string
}): string {
  const { orderCode, productName, variantName, amount, customerName, deliveryContent, lookupUrl } =
    vars
  const safeDelivery = deliveryContent
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')

  return `<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0f1e;font-family:Inter,Arial,sans-serif;color:#e2e8f0">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0f1e;padding:32px 16px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#111827;border-radius:16px;overflow:hidden;border:1px solid #1f2937">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#06b6d4,#10b981);padding:32px;text-align:center">
          <div style="font-size:32px;margin-bottom:8px">⚡</div>
          <h1 style="margin:0;color:#fff;font-size:22px;font-weight:800">ThanhLongShop</h1>
          <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:14px">Xác nhận đơn hàng</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:32px">
          <p style="margin:0 0 24px;font-size:16px;color:#94a3b8">
            Xin chào <strong style="color:#fff">${customerName}</strong>,<br>
            Đơn hàng của bạn đã được thanh toán và xử lý thành công! 🎉
          </p>

          <!-- Order info -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#1e293b;border-radius:12px;margin-bottom:24px">
            <tr><td style="padding:20px">
              <table width="100%" cellpadding="6" cellspacing="0">
                <tr>
                  <td style="color:#64748b;font-size:13px;width:40%">Mã đơn</td>
                  <td style="color:#06b6d4;font-family:monospace;font-weight:700;font-size:14px">${orderCode}</td>
                </tr>
                <tr>
                  <td style="color:#64748b;font-size:13px">Sản phẩm</td>
                  <td style="color:#fff;font-weight:600;font-size:14px">${productName}</td>
                </tr>
                <tr>
                  <td style="color:#64748b;font-size:13px">Gói</td>
                  <td style="color:#fff;font-size:14px">${variantName}</td>
                </tr>
                <tr>
                  <td style="color:#64748b;font-size:13px">Số tiền</td>
                  <td style="color:#10b981;font-weight:800;font-size:16px">${formatPrice(amount)}</td>
                </tr>
              </table>
            </td></tr>
          </table>

          <!-- Delivery content -->
          <div style="background:#0f2027;border:1px solid #10b981;border-radius:12px;padding:20px;margin-bottom:24px">
            <p style="margin:0 0 12px;color:#10b981;font-weight:700;font-size:14px">🔐 Thông tin bàn giao</p>
            <pre style="margin:0;color:#e2e8f0;font-size:14px;line-height:1.7;white-space:pre-wrap;word-break:break-word;font-family:monospace">${safeDelivery}</pre>
          </div>

          <!-- Note -->
          <div style="background:#1e293b;border-radius:12px;padding:16px;margin-bottom:24px">
            <p style="margin:0;color:#94a3b8;font-size:13px;line-height:1.7">
              ⚠️ <strong style="color:#fbbf24">Lưu ý quan trọng:</strong><br>
              • Vui lòng lưu lại email này để tham khảo sau.<br>
              • Không chia sẻ thông tin tài khoản cho người khác.<br>
              • Nếu cần hỗ trợ, liên hệ Zalo shop để được giúp đỡ.
            </p>
          </div>

          <!-- Lookup link -->
          <div style="text-align:center;margin-bottom:8px">
            <a href="${lookupUrl}" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#06b6d4,#10b981);color:#fff;text-decoration:none;border-radius:10px;font-weight:700;font-size:14px">
              Tra cứu đơn hàng →
            </a>
          </div>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:20px 32px;border-top:1px solid #1f2937;text-align:center">
          <p style="margin:0;color:#475569;font-size:12px">
            © ${new Date().getFullYear()} ThanhLongShop · Email này được gửi tự động, vui lòng không reply.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export interface SendDeliveryEmailOptions {
  to: string
  orderCode: string
  customerName: string
  productName: string
  variantName: string
  amount: number
  deliveryContent: string
}

/**
 * Sends delivery email to customer.
 * Returns true on success, false if SMTP not configured or send fails.
 * Never throws — caller should handle the boolean result.
 */
export async function sendDeliveryEmail(opts: SendDeliveryEmailOptions): Promise<boolean> {
  const transporter = createTransporter()
  if (!transporter) {
    console.warn('[EMAIL] SMTP not configured — skipping email send')
    return false
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@thanhlongshop.net'

  try {
    await transporter.sendMail({
      from: `ThanhLongShop <${from}>`,
      to: opts.to,
      subject: `ThanhLongShop - Thông tin đơn hàng ${opts.orderCode}`,
      html: orderEmailHtml({
        orderCode: opts.orderCode,
        productName: opts.productName,
        variantName: opts.variantName,
        amount: opts.amount,
        customerName: opts.customerName,
        customerEmail: opts.to,
        deliveryContent: opts.deliveryContent,
        lookupUrl: `${siteUrl}/orders/lookup`,
      }),
    })
    return true
  } catch (err) {
    console.error('[EMAIL] send failed:', err instanceof Error ? err.message : err)
    return false
  }
}
