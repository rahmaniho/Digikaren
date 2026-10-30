// Shared by the demo checkout API and storefront quantity controls.
export const MAX_QUANTITY = 10

export function productQuantityLimit(product) {
  if (!product) return 0
  if (product.stock == null) return MAX_QUANTITY // Catalog fallback while inventory is unavailable.
  if (!Number.isSafeInteger(product.stock)) return 0
  return Math.max(0, Math.min(MAX_QUANTITY, product.stock))
}

export function quantityAvailableToAdd(product, inCart) {
  const quantity = Number.isSafeInteger(inCart) && inCart >= 0 ? inCart : 0
  return Math.max(0, productQuantityLimit(product) - quantity)
}
