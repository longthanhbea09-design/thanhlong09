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
  internalNote: z.string().max(1000).optional(),
})

export const productSchema = z.object({
  name: z.string().min(1, 'Tên sản phẩm không được trống'),
  slug: z.string().min(1, 'Slug không được trống').regex(/^[a-z0-9-]+$/, 'Slug chỉ gồm chữ thường, số và dấu gạch ngang'),
  category: z.enum(['AI', 'Thiết kế', 'Giải trí', 'Học tập', 'Văn phòng']),
  description: z.string().min(10, 'Mô tả ít nhất 10 ký tự'),
  priceFrom: z.number().min(1000, 'Giá tối thiểu 1.000đ'),
  badge: z.string().optional(),
  icon: z.string().default('📦'),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
})

export const settingSchema = z.object({
  shopName: z.string().min(1),
  zalo: z.string().min(9),
  facebook: z.string(),
  telegram: z.string(),
  supportEmail: z.string().email(),
  bankName: z.string(),
  bankAccount: z.string(),
  bankOwner: z.string(),
  qrCodeUrl: z.string().url().optional().or(z.literal('')),
})

export type OrderFormData = z.infer<typeof orderSchema>
export type AdminLoginData = z.infer<typeof adminLoginSchema>
export type UpdateOrderData = z.infer<typeof updateOrderSchema>
export type ProductData = z.infer<typeof productSchema>
export type SettingData = z.infer<typeof settingSchema>
