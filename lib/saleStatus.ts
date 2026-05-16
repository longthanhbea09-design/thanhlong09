export type SaleStatus = 'IN_STOCK' | 'OUT_OF_STOCK' | 'PREORDER' | 'HIDDEN' | 'MAINTENANCE'

export function getSaleStatus({
  planSaleMode,
  planAvailable,
  stockCount,
}: {
  planSaleMode: string
  planAvailable: boolean
  stockCount: number
}): SaleStatus {
  if (planSaleMode === 'FORCE_HIDDEN') return 'HIDDEN'
  if (planSaleMode === 'MAINTENANCE') return 'MAINTENANCE'
  if (planSaleMode === 'PREORDER') return 'PREORDER'
  // AUTO_STOCK: manual available=false OR no stock → OUT_OF_STOCK
  if (!planAvailable || stockCount <= 0) return 'OUT_OF_STOCK'
  return 'IN_STOCK'
}
