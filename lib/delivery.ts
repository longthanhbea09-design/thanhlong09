import { formatPrice, formatDate } from './utils'

export const DEFAULT_DELIVERY_TEMPLATE = `🎉 Thanh toán thành công!

🧾 Mã đơn: {{orderCode}}
📦 Sản phẩm: {{productName}}
📌 Gói: {{variantName}}
💰 Số tiền: {{amount}}
📅 Ngày tạo: {{createdAt}}

🔑 Thông tin bàn giao:

{{deliveryContent}}

Cảm ơn bạn đã mua hàng tại {{shopName}}.
Nếu cần hỗ trợ, vui lòng nhắn Zalo: {{zaloPhone}}`

export interface DeliveryVars {
  orderCode: string
  productName: string
  variantName: string
  amount: number
  createdAt: string | Date
  paidAt?: string | Date | null
  customerName: string
  phone: string
  deliveryContent: string
  shopName: string
  zaloPhone: string
}

export function renderDelivery(template: string, vars: DeliveryVars): string {
  return template
    .replace(/{{orderCode}}/g, vars.orderCode)
    .replace(/{{productName}}/g, vars.productName)
    .replace(/{{variantName}}/g, vars.variantName)
    .replace(/{{amount}}/g, formatPrice(vars.amount))
    .replace(/{{createdAt}}/g, formatDate(vars.createdAt))
    .replace(/{{paidAt}}/g, vars.paidAt ? formatDate(vars.paidAt) : '—')
    .replace(/{{customerName}}/g, vars.customerName)
    .replace(/{{phone}}/g, vars.phone)
    .replace(/{{deliveryContent}}/g, vars.deliveryContent)
    .replace(/{{shopName}}/g, vars.shopName)
    .replace(/{{zaloPhone}}/g, vars.zaloPhone)
}

export function canSeeDelivery(paymentStatus: string, deliveryVisible: boolean): boolean {
  return paymentStatus === 'paid' && deliveryVisible
}
