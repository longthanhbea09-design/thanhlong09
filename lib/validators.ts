import { z } from 'zod'

export const orderSchema = z.object({
  customerName: z.string().min(2, 'Vui lòng nhập họ tên (ít nhất 2 ký tự)'),
  phone: z
    .string()
    .min(9, 'Số điện thoại không hợp lệ')
    .max(11, 'Số điện thoại không hợp lệ')
    .regex(/^[0-9]+$/, 'Số điện thoại chỉ gồm chữ số'),
  email: z.string().email('Email không hợp lệ').optional().or(z.literal('')),
  contactMethod: z.enum(['zalo', 'facebook', 'telegram', 'phone']).default('zalo'),
  productId: z.string().min(1, 'Vui lòng chọn sản phẩm'),
  planId: z.string().min(1, 'Vui lòng chọn gói thời hạn'),
  note: z.string().max(500, 'Ghi chú tối đa 500 ký tự').optional(),
  honeypot: z.string().max(0, 'Invalid').optional(),
})

export const adminLoginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu ít nhất 6 ký tự'),
})

export const updateOrderSchema = z.object({
  status: z.enum(['new', 'contacting', 'paid', 'processing', 'completed', 'cancelled']).optional(),
  internalNote: z.string().max(2000).optional().nullable(),
  deliveryContent: z.string().max(5000).optional().nullable(),
  deliveryVisible: z.boolean().optional(),
  completedAt: z.string().optional().nullable(),
})

export const productSchema = z.object({
  name: z.string().min(1, 'Tên sản phẩm không được trống'),
  slug: z.string().min(1, 'Slug không được trống').regex(/^[a-z0-9-]+$/, 'Slug chỉ gồm chữ thường, số và dấu gạch ngang'),
  category: z.enum(['AI', 'Thiết kế', 'Giải trí', 'Học tập', 'Văn phòng']),
  description: z.string().min(10, 'Mô tả ít nhất 10 ký tự'),
  priceFrom: z.number().min(0, 'Giá không hợp lệ'),
  badge: z.string().optional().nullable(),
  icon: z.string().default('📦'),
  imageUrl: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  sortOrder: z.number().default(0),
})

export const modalCheckoutSchema = z.object({
  customerName: z.string().min(2, 'Vui lòng nhập họ tên (ít nhất 2 ký tự)'),
  phone: z
    .string()
    .min(9, 'Số điện thoại không hợp lệ')
    .max(11, 'Số điện thoại không hợp lệ')
    .regex(/^[0-9]+$/, 'Số điện thoại chỉ gồm chữ số'),
  email: z.string().email('Email không hợp lệ'),
  note: z.string().max(500, 'Ghi chú tối đa 500 ký tự').optional(),
  planId: z.string().min(1, 'Vui lòng chọn gói'),
  honeypot: z.string().max(0, 'Invalid').optional(),
})

export const settingSchema = z.object({
  shopName: z.string().min(1, 'Tên shop không được trống'),
  zalo: z.string().default(''),
  zaloLink: z.string().nullable().optional(),
  facebook: z.string().default(''),
  facebookLink: z.string().nullable().optional(),
  telegram: z.string().default(''),
  telegramLink: z.string().nullable().optional(),
  hotline: z.string().nullable().optional(),
  supportEmail: z.string().email('Email không hợp lệ'),
  maintenanceMode: z.boolean().default(false),
  maintenanceTitle: z.string().nullable().optional(),
  maintenanceMessage: z.string().nullable().optional(),
  deliveryTemplate: z.string().nullable().optional(),
})

export const EWALLET_PROVIDERS = ['MOMO', 'ZALOPAY', 'VIETTELMONEY', 'SHOPEEPAY', 'OTHER'] as const
export type EwalletProvider = (typeof EWALLET_PROVIDERS)[number]

export const EWALLET_PROVIDER_LABELS: Record<EwalletProvider, string> = {
  MOMO: 'MoMo',
  ZALOPAY: 'ZaloPay',
  VIETTELMONEY: 'Viettel Money',
  SHOPEEPAY: 'ShopeePay',
  OTHER: 'Khác',
}

export const paymentMethodSchema = z.object({
  type: z.enum(['BANK', 'EWALLET']),
  provider: z.string().min(1, 'Chọn loại ví'),
  name: z.string().min(1, 'Tên ví không được trống').max(100),
  accountNo: z.string().max(50).nullable().optional(),
  accountName: z.string().max(100).nullable().optional(),
  phone: z.string().max(20).nullable().optional(),
  qrImage: z.string().nullable().optional(),
  paymentUrl: z.string().nullable().optional(),
  transferNote: z.string().max(500).nullable().optional(),
  note: z.string().max(500).nullable().optional(),
  enabled: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
})

export type PaymentMethodData = z.infer<typeof paymentMethodSchema>

export type OrderFormData = z.infer<typeof orderSchema>
export type ModalCheckoutData = z.infer<typeof modalCheckoutSchema>

export type AdminLoginData = z.infer<typeof adminLoginSchema>
export type UpdateOrderData = z.infer<typeof updateOrderSchema>
export type ProductData = z.infer<typeof productSchema>
export type SettingData = z.infer<typeof settingSchema>
