import test from 'node:test'
import assert from 'node:assert/strict'
import { viewFromSearch, viewUrl, followProductLink } from '../src/navigation.js'

test('product and existing storefront routes round-trip through shareable URLs', () => {
  const views = [
    { type: 'home' }, { type: 'product', id: 'pet-toy' },
    { type: 'category', id: 'beauty', sub: 'oral' }, { type: 'categories' },
    { type: 'search', query: 'ساز و موسیقی + دیجیتال' }, { type: 'deals' },
    { type: 'favorites' }, { type: 'all', sort: 'newest' },
    { type: 'compare', ids: ['phone-pro', 'earbuds'] },
    { type: 'search', query: 'چراغ خواب', sort: 'cheapest', min: 100000, max: 900000, discount: true },
    { type: 'category', id: 'home', sub: 'decor', available: true, max: 5000000 },
    { type: 'all', discount: 25 },
  ]
  for (const view of views) assert.deepEqual(viewFromSearch(viewUrl(view)), view)
  assert.equal(viewUrl({ type: 'product', id: 'phone-pro' }, '/shop'), '/shop?product=phone-pro')
  assert.deepEqual(viewFromSearch('?product=missing'), { type: 'product', id: 'missing' })
})

test('untrusted comparison and filter links are bounded and invalid ranges are ignored', () => {
  assert.deepEqual(viewFromSearch('?compare=phone-pro,phone-pro,../x,watch,headphone,earbuds,extra'), { type: 'compare', ids: ['phone-pro', 'watch', 'headphone', 'earbuds'] })
  assert.deepEqual(viewFromSearch('?all=1&min=500&max=100&sort=oops&discount=2'), { type: 'all' })
  assert.deepEqual(viewFromSearch('?all=1&min=%DB%B1%DB%B0%DB%B0&max=500&available=1'), { type: 'all', min: 100, max: 500, available: true })
  assert.deepEqual(viewFromSearch('?all=1&discount=25'), { type: 'all', discount: 25 })
  assert.deepEqual(viewFromSearch('?all=1&discount=-25'), { type: 'all' })
  assert.equal(viewUrl({ type: 'compare', ids: ['phone-pro', 'watch'] }, '/Digikaren/'), '/Digikaren/?compare=phone-pro%2Cwatch')
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
