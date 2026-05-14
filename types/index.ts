export interface ProductPlan {
  id: string
  productId: string
  name: string
  duration: string
  price: number
  description: string | null
  isActive: boolean
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
  isActive: boolean
  isFeatured: boolean
  createdAt: Date
  updatedAt: Date
  plans: ProductPlan[]
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
  createdAt: Date
  updatedAt: Date
  product: Product
  plan: ProductPlan
}

export interface Setting {
  id: string
  shopName: string
  zalo: string
  facebook: string
  telegram: string
  supportEmail: string
  bankName: string
  bankAccount: string
  bankOwner: string
  qrCodeUrl: string | null
}

export interface Admin {
  id: string
  email: string
  role: string
}
