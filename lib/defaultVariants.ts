import type { Product } from '@/types'

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
  saleStatus: string
  badge?: string
}

export function getProductVariants(product: Product): ProductVariant[] {
  return product.plans
    .filter((p) => p.isActive && p.saleStatus !== 'HIDDEN')
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((p) => {
      const ss = p.saleStatus ?? (p.available ? 'IN_STOCK' : 'OUT_OF_STOCK')
      return {
        id: p.id,
        planId: p.id,
        name: p.name,
        duration: p.duration,
        type: p.type,
        warrantyText: p.warrantyText || 'KBH',
        subLabel: p.description ?? '',
        price: p.price,
        disabled: ss === 'OUT_OF_STOCK' || ss === 'MAINTENANCE' || p.price <= 0,
        saleStatus: ss,
        badge: p.badge ?? undefined,
      }
    })
}
