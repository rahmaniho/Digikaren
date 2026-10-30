// Catalog discovery is kept independent of React so search and filters can be
// validated for both the Pages build and the server-backed demo.
export const SORTS = ['suggested', 'newest', 'popular', 'cheapest', 'expensive']
export const DISCOUNT_LEVELS = [20, 25, 30, 40]

export function normalizeText(value = '') {
  const persian = '۰۱۲۳۴۵۶۷۸۹'
  const arabic = '٠١٢٣٤٥٦٧٨٩'
  return String(value ?? '').normalize('NFKC').toLowerCase()
    .replace(/[۰-۹٠-٩]/g, (char) => String(persian.includes(char) ? persian.indexOf(char) : arabic.indexOf(char)))
    .replace(/[يى]/g, 'ی').replace(/ك/g, 'ک')
    .replace(/[\u064b-\u065f\u0670\u0640]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ')
}

// null = no bound; NaN = invalid. Prices are non-negative whole tomans.
export function parsePrice(value) {
  if (value == null || String(value).trim() === '') return null
  const persian = '۰۱۲۳۴۵۶۷۸۹'
  const arabic = '٠١٢٣٤٥٦٧٨٩'
  const digits = String(value).replace(/[۰-۹٠-٩]/g, (char) => String(persian.includes(char) ? persian.indexOf(char) : arabic.indexOf(char)))
    .replace(/[,،٬\s]/g, '')
  if (!/^\d+$/.test(digits)) return NaN
  const price = Number(digits)
  return Number.isSafeInteger(price) && price >= 0 ? price : NaN
}

export function matchesProduct(product, query, categories) {
  const terms = normalizeText(query).split(' ').filter(Boolean)
  if (!terms.length) return true
  const labels = (product.categories || []).flatMap((id) => {
    const category = categories.find((item) => item.id === id)
    const ids = product.subcategories?.[id] || []
    return [category?.label || '', ...(category?.sub.filter((item) => ids.includes(item.id)).map((item) => item.label) || [])]
  })
  const text = normalizeText([product.id, product.title, ...(product.features || []), ...labels].join(' '))
  return terms.every((term) => text.includes(term))
}

export function filterCatalog(products, { view, favorites = [], categories, inventoryKnown = false }) {
  const category = categories.find((item) => item.id === view.id)
  const invalidCategory = view.type === 'category' && (!category || Boolean(view.sub && !category.sub.some((item) => item.id === view.sub)))
  let list = products.filter((product) => {
    if (invalidCategory) return false
    if (view.type === 'category' && !product.categories.includes(view.id)) return false
    if (view.type === 'category' && view.sub && !product.subcategories?.[view.id]?.includes(view.sub)) return false
    if (view.type === 'favorites' && !favorites.includes(product.id)) return false
    if (view.type === 'deals' && !product.discount) return false
    if (view.type === 'search' && !matchesProduct(product, view.query, categories)) return false
    if (view.discount && (Number(product.discount) || 0) < (view.discount === true ? 1 : view.discount)) return false
    if (view.available && inventoryKnown && (!Number.isSafeInteger(product.stock) || product.stock <= 0)) return false
    if (view.min != null && product.price < view.min) return false
    if (view.max != null && product.price > view.max) return false
    return true
  })
  if (view.sort === 'cheapest') list = [...list].sort((a, b) => a.price - b.price)
  if (view.sort === 'expensive') list = [...list].sort((a, b) => b.price - a.price)
  if (view.sort === 'popular') list = [...list].sort((a, b) => (b.sold || 0) - (a.sold || 0))
  if (view.sort === 'newest') list = [...list].reverse()
  return { products: list, invalidCategory }
}
