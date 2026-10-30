// Show only catalog items sharing a category; matching subcategories are more relevant.
export function relatedProducts(product, catalog, limit = 6) {
  if (!product || !Array.isArray(catalog) || !Number.isFinite(limit) || limit <= 0) return []
  const categoryIds = new Set(product.categories || [])
  return catalog.flatMap((candidate, index) => {
    if (candidate.id === product.id) return []
    let score = 0
    for (const category of candidate.categories || []) {
      if (!categoryIds.has(category)) continue
      score += 1
      const currentSubs = new Set(product.subcategories?.[category] || [])
      score += (candidate.subcategories?.[category] || []).filter((id) => currentSubs.has(id)).length * 4
    }
    return score ? [{ candidate, score, index }] : []
  }).sort((a, b) => Number(a.candidate.stock === 0) - Number(b.candidate.stock === 0) || b.score - a.score || a.index - b.index)
    .slice(0, Math.floor(limit))
    .map(({ candidate }) => candidate)
}
