import test from 'node:test'
import assert from 'node:assert/strict'
import { relatedProducts } from '../src/recommendations.js'
import { products } from '../src/data.js'

test('recommendations prefer shared subcategories, avoid unrelated items and put unavailable items last', () => {
  const product = { id: 'a', categories: ['home'], subcategories: { home: ['kitchen'] }, stock: 4 }
  const unrelated = { id: 'x', categories: ['pets'], subcategories: { pets: ['food'] }, stock: 8 }
  const categoryMatch = { id: 'b', categories: ['home'], subcategories: { home: ['decor'] }, stock: 2 }
  const subcategoryMatch = { id: 'c', categories: ['home'], subcategories: { home: ['kitchen'] }, stock: 1 }
  const outOfStock = { id: 'd', categories: ['home'], subcategories: { home: ['kitchen'] }, stock: 0 }
  assert.deepEqual(relatedProducts(product, [product, unrelated, categoryMatch, outOfStock, subcategoryMatch]).map((item) => item.id), ['c', 'b', 'd'])
  assert.deepEqual(relatedProducts(product, [subcategoryMatch, categoryMatch], 1).map((item) => item.id), ['c'])
  assert.deepEqual(relatedProducts(product, [unrelated]), [])
  assert.deepEqual(relatedProducts(null, [subcategoryMatch]), [])
})

test('real catalog recommendations stay within the current product categories', () => {
  for (const product of products) {
    const recommendations = relatedProducts(product, products)
    assert.ok(recommendations.length <= 6)
    assert.ok(recommendations.every((item) => item.id !== product.id && item.categories.some((id) => product.categories.includes(id))))
  }
})
