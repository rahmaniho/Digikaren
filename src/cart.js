import { MAX_QUANTITY, productQuantityLimit } from './cart-limits.js'
import { isProductId } from './comparison.js'

// Recover gracefully from edited or outdated browser storage without trusting it.
export function cleanCart(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(Object.entries(value).flatMap(([id, quantity]) => {
    if (!isProductId(id) || !Number.isSafeInteger(quantity) || quantity <= 0) return []
    return [[id, Math.min(quantity, MAX_QUANTITY)]]
  }))
}

export function cartIssues(cart, products) {
  const byId = new Map(products.map((product) => [product.id, product]))
  const unknown = []
  const quantity = []
  for (const [id, count] of Object.entries(cleanCart(cart))) {
    const product = byId.get(id)
    if (!product) unknown.push(id)
    else if (count > productQuantityLimit(product)) quantity.push(id)
  }
  return { unknown, quantity }
}
