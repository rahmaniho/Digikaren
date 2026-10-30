export const MAX_COMPARE = 4
export const MAX_RECENT = 12
const productIdPattern = /^[a-z0-9][a-z0-9-]{0,79}$/

export function isProductId(id) {
  return typeof id === 'string' && productIdPattern.test(id)
}

// Local storage and shared URLs are untrusted; keep only unique safe IDs.
export function cleanProductIds(value, limit = MAX_COMPARE) {
  if (!Array.isArray(value)) return []
  return [...new Set(value.filter(isProductId))].slice(0, limit)
}

export function toggleComparison(value, id) {
  const current = cleanProductIds(value)
  if (!isProductId(id)) return { ids: current, result: 'invalid' }
  if (current.includes(id)) return { ids: current.filter((item) => item !== id), result: 'removed' }
  if (current.length >= MAX_COMPARE) return { ids: current, result: 'full' }
  return { ids: [...current, id], result: 'added' }
}

export function recordViewed(value, id) {
  const current = cleanProductIds(value, MAX_RECENT)
  if (!isProductId(id)) return current
  return [id, ...current.filter((item) => item !== id)].slice(0, MAX_RECENT)
}
