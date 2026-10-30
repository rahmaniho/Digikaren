// Keep links and History API navigation in sync, including shareable product URLs.
export function viewFromSearch(search = '') {
  const params = new URLSearchParams(search)
  if (params.has('product')) return { type: 'product', id: params.get('product') || '' }
  if (params.has('q')) return { type: 'search', query: params.get('q') || '' }
  if (params.has('category')) return { type: 'category', id: params.get('category'), sub: params.get('sub') || undefined }
  if (params.has('categories')) return { type: 'categories' }
  if (params.has('deals')) return { type: 'deals' }
  if (params.has('favorites')) return { type: 'favorites' }
  if (params.has('all')) return { type: 'all', sort: params.get('sort') || undefined }
  return { type: 'home' }
}

export function viewUrl(view, pathname = '') {
  const params = new URLSearchParams()
  if (view.type === 'product') params.set('product', view.id)
  if (view.type === 'category') { params.set('category', view.id); if (view.sub) params.set('sub', view.sub) }
  if (view.type === 'categories') params.set('categories', '1')
  if (view.type === 'search') params.set('q', view.query)
  if (view.type === 'deals') params.set('deals', '1')
  if (view.type === 'favorites') params.set('favorites', '1')
  if (view.type === 'all') { params.set('all', '1'); if (view.sort) params.set('sort', view.sort) }
  const query = params.toString()
  return `${pathname}${query ? `?${query}` : ''}`
}

export function followProductLink(event, id, go) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  event.preventDefault()
  go({ type: 'product', id })
}
