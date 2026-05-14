import type { Product, ProductPlan } from '@/types'

export interface ProductVariant {
  id: string
  planId: string
  name: string
  duration: string
  type: string
  warrantyText: string
  subLabel: string
  price: number
  disabled: boolean
  badge?: string
}

export function getProductVariants(product: Product): ProductVariant[] {
  return product.plans
    .filter((p) => p.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((p) => ({
      id: p.id,
      planId: p.id,
      name: p.name,
      duration: p.duration,
      type: p.type,
      warrantyText: p.warrantyText || 'KBH',
      subLabel: p.description ?? '',
      price: p.price,
      disabled: !p.available,
      badge: p.badge ?? undefined,
    }))
}
