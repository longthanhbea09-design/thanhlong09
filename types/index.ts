export interface ProductPlan {
  id: string
  productId: string
  name: string
  duration: string
  type: string
  price: number
  warrantyText: string
  description: string | null
  badge: string | null
  available: boolean
  isActive: boolean
  sortOrder: number
}

export interface Product {
  id: string
  name: string
  slug: string
  category: string
  description: string
  priceFrom: number
  badge: string | null
  icon: string
  imageUrl: string | null
  isActive: boolean
  isFeatured: boolean
  sortOrder: number
  createdAt: Date
  updatedAt: Date
  plans: ProductPlan[]
}

export interface AccountStock {
  id: string
  productId: string
  planId: string
  username: string
  password: string
  extraInfo: string
  // 'available' | 'sold' | 'disabled'
  status: string
  orderId: string | null
  soldAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface Order {
  id: string
  orderCode: string
  customerName: string
  phone: string
  email: string | null
  contactMethod: string
  productId: string
  planId: string
  note: string | null
  status: string
  internalNote: string | null
  amount: number
  paymentStatus: string
  paidAt: Date | null
  // 'waiting_payment' | 'delivered' | 'out_of_stock'
  deliveryStatus: string
  deliveryContent: string | null
  deliveryVisible: boolean
  deliveredAt: Date | null
  completedAt: Date | null
  emailStatus: string | null
  emailSentAt: Date | null
  createdAt: Date
  updatedAt: Date
  product: Product
  plan: ProductPlan
  accountStock?: AccountStock | null
}

export interface Setting {
  id: string
  shopName: string
  zalo: string
  zaloLink: string | null
  facebook: string
  facebookLink: string | null
  telegram: string
  telegramLink: string | null
  hotline: string | null
  supportEmail: string
  bankName: string
  bankBin: string | null
  bankAccount: string
  bankOwner: string
  qrCodeUrl: string | null
  maintenanceMode: boolean
  maintenanceTitle: string | null
  maintenanceMessage: string | null
  deliveryTemplate: string | null
}

export interface Admin {
  id: string
  email: string
  role: string
}
