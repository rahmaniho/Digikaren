import test from 'node:test'
import assert from 'node:assert/strict'
import { viewFromSearch, viewUrl, followProductLink } from '../src/navigation.js'

test('product and existing storefront routes round-trip through shareable URLs', () => {
  const views = [
    { type: 'home' }, { type: 'product', id: 'pet-toy' },
    { type: 'category', id: 'beauty', sub: 'oral' }, { type: 'categories' },
    { type: 'search', query: 'ساز و موسیقی + دیجیتال' }, { type: 'deals' },
    { type: 'favorites' }, { type: 'all', sort: 'newest' },
  ]
  for (const view of views) assert.deepEqual(viewFromSearch(viewUrl(view)), view)
  assert.equal(viewUrl({ type: 'product', id: 'phone-pro' }, '/shop'), '/shop?product=phone-pro')
  assert.deepEqual(viewFromSearch('?product=missing'), { type: 'product', id: 'missing' })
})

test('product links keep normal browser behavior for modified clicks', () => {
  let prevented = 0
  const visits = []
  const event = (overrides = {}) => ({ button: 0, preventDefault: () => { prevented++ }, ...overrides })
  followProductLink(event(), 'monitor', (view) => visits.push(view))
  followProductLink(event({ ctrlKey: true }), 'monitor', (view) => visits.push(view))
  followProductLink(event({ metaKey: true }), 'monitor', (view) => visits.push(view))
  followProductLink(event({ button: 1 }), 'monitor', (view) => visits.push(view))
  assert.equal(prevented, 1)
  assert.deepEqual(visits, [{ type: 'product', id: 'monitor' }])
})
