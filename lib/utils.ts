import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(price)
}

export function generateOrderCode(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const random = Math.floor(1000 + Math.random() * 9000)
  return `TLS-${year}${month}${day}-${random}`
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export const ORDER_STATUS_MAP: Record<string, { label: string; color: string }> = {
  new: { label: 'Mới', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  contacting: { label: 'Đang liên hệ', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  paid: { label: 'Đã thanh toán', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  processing: { label: 'Đang xử lý', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  completed: { label: 'Hoàn thành', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  cancelled: { label: 'Đã hủy', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
}

export const CONTACT_METHOD_MAP: Record<string, string> = {
  zalo: 'Zalo',
  facebook: 'Facebook',
  telegram: 'Telegram',
  phone: 'Gọi điện',
}

export const CATEGORIES = ['Tất cả', 'AI', 'Thiết kế', 'Giải trí', 'Học tập', 'Văn phòng']
