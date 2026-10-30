import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeText, parsePrice, matchesProduct, filterCatalog } from '../src/discovery.js'
import { categories, products } from '../src/data.js'

test('search handles Persian/Arabic characters, digits and words in any order', () => {
  assert.equal(normalizeText('  كِتاب‌ ۱۲۳ / USB-C '), 'کتاب 123 usb c')
  const cable = products.find((product) => product.id === 'usb-cable')
  assert.equal(matchesProduct(cable, 'شارژ كابل usb c', categories), true)
  assert.equal(matchesProduct(cable, 'شارژ موبایل', categories), true)
  assert.equal(matchesProduct(cable, 'شارژ بالش', categories), false)
  assert.equal(matchesProduct(products.find((p) => p.id === 'phone-pro'), '۲۵۶ k1', categories), true)
})

test('price input accepts Persian, Arabic and grouped whole tomans only', () => {
  assert.equal(parsePrice('۱٬۲۵۰٬۰۰۰'), 1250000)
  assert.equal(parsePrice('١,٢٣٤'), 1234)
  assert.equal(parsePrice(' 0 '), 0)
  assert.equal(parsePrice(''), null)
  for (const value of ['-1', '12.5', '1e5', 'abc', '۹۹۹۹۹۹۹۹۹۹۹۹۹۹۹۹۹']) assert.ok(Number.isNaN(parsePrice(value)), value)
})

test('filters, search, sorting and stock operate on real catalog data', () => {
  const view = { type: 'search', query: 'روشنایی چراغ', min: 300000, max: 1000000, sort: 'cheapest' }
  const result = filterCatalog(products, { view, categories })
  assert.deepEqual(result.products.map((product) => product.id), ['night-light', 'desk-lamp'])
  assert.equal(result.invalidCategory, false)
  const favoriteResult = filterCatalog(products, { view: { type: 'favorites', discount: true }, categories, favorites: ['desk-lamp'] })
  assert.deepEqual(favoriteResult.products.map((product) => product.id), ['desk-lamp'])
  const discounted = filterCatalog(products, { view: { type: 'all', discount: 25 }, categories }).products
  assert.ok(discounted.length > 0 && discounted.length < products.length)
  assert.ok(discounted.every((product) => product.discount >= 25))
  assert.deepEqual(filterCatalog([{ ...products[0], discount: 0 }, { ...products[1], discount: undefined }], { view: { type: 'all', discount: true }, categories }).products, [])
  assert.equal(filterCatalog(products, { view: { type: 'category', id: 'missing' }, categories }).invalidCategory, true)
  const inventory = [{ ...products[0], id: 'one', stock: 1 }, { ...products[1], id: 'zero', stock: 0 }, { ...products[2], id: 'unknown' }]
  assert.deepEqual(filterCatalog(inventory, { view: { type: 'all', available: true }, categories, inventoryKnown: true }).products.map((p) => p.id), ['one'])
  assert.equal(filterCatalog(inventory, { view: { type: 'all', available: true }, categories, inventoryKnown: false }).products.length, 3)
})
