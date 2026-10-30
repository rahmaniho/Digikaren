import { cleanProductIds } from './comparison.js'
import { DISCOUNT_LEVELS, parsePrice, SORTS } from './discovery.js'

const catalogTypes = new Set(['all', 'category', 'search', 'deals', 'favorites'])

function withCatalogOptions(view, params) {
  const sort = params.get('sort')
  if (sort && sort !== 'suggested' && SORTS.includes(sort)) view.sort = sort
  const min = parsePrice(params.get('min'))
  const max = parsePrice(params.get('max'))
  if (!Number.isNaN(min) && !Number.isNaN(max) && (min == null || max == null || min <= max)) {
    if (min != null) view.min = min
    if (max != null) view.max = max
  }
  const discount = params.get('discount')
  if (discount === '1') view.discount = true
  else if (discount && DISCOUNT_LEVELS.includes(Number(discount))) view.discount = Number(discount)
  if (params.get('available') === '1') view.available = true
  return view
}

// Keep links and History API navigation in sync, including comparison and
// filter URLs that work from a static project subpath.
export function viewFromSearch(search = '') {
  const params = new URLSearchParams(search)
  if (params.has('product')) return { type: 'product', id: params.get('product') || '' }
  if (params.has('compare')) return { type: 'compare', ids: cleanProductIds((params.get('compare') || '').split(',')) }
  if (params.has('q')) return withCatalogOptions({ type: 'search', query: params.get('q') || '' }, params)
  if (params.has('category')) return withCatalogOptions({ type: 'category', id: params.get('category'), sub: params.get('sub') || undefined }, params)
  if (params.has('categories')) return { type: 'categories' }
  if (params.has('deals')) return withCatalogOptions({ type: 'deals' }, params)
  if (params.has('favorites')) return withCatalogOptions({ type: 'favorites' }, params)
  if (params.has('all')) return withCatalogOptions({ type: 'all' }, params)
  return { type: 'home' }
}

export function viewUrl(view, pathname = '') {
  const params = new URLSearchParams()
  if (view.type === 'product') params.set('product', view.id)
  if (view.type === 'compare') params.set('compare', cleanProductIds(view.ids).join(','))
  if (view.type === 'category') { params.set('category', view.id); if (view.sub) params.set('sub', view.sub) }
  if (view.type === 'categories') params.set('categories', '1')
  if (view.type === 'search') params.set('q', view.query)
  if (view.type === 'deals') params.set('deals', '1')
  if (view.type === 'favorites') params.set('favorites', '1')
  if (view.type === 'all') params.set('all', '1')
  if (catalogTypes.has(view.type)) {
    if (view.sort && view.sort !== 'suggested' && SORTS.includes(view.sort)) params.set('sort', view.sort)
    const min = parsePrice(view.min)
    const max = parsePrice(view.max)
    if (!Number.isNaN(min) && !Number.isNaN(max) && (min == null || max == null || min <= max)) {
      if (min != null) params.set('min', String(min))
      if (max != null) params.set('max', String(max))
    }
    if (view.discount === true) params.set('discount', '1')
    else if (DISCOUNT_LEVELS.includes(view.discount)) params.set('discount', String(view.discount))
    if (view.available) params.set('available', '1')
  }
  const query = params.toString()
  return `${pathname}${query ? `?${query}` : ''}`
}

export function followProductLink(event, id, go) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  event.preventDefault()
  go({ type: 'product', id })
}
