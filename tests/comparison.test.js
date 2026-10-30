import test from 'node:test'
import assert from 'node:assert/strict'
import { cleanProductIds, toggleComparison, recordViewed, MAX_COMPARE, MAX_RECENT } from '../src/comparison.js'
import { cleanCart, cartIssues } from '../src/cart.js'

test('comparison selections are bounded, unique, removable and safe', () => {
  assert.deepEqual(cleanProductIds(['one', 'one', '../x', null, 'two', 'three', 'four', 'five']), ['one', 'two', 'three', 'four'])
  const full = ['one', 'two', 'three', 'four']
  assert.equal(full.length, MAX_COMPARE)
  assert.deepEqual(toggleComparison(full, 'five'), { ids: full, result: 'full' })
  assert.deepEqual(toggleComparison(full, 'two'), { ids: ['one', 'three', 'four'], result: 'removed' })
  assert.deepEqual(toggleComparison(['one'], 'two'), { ids: ['one', 'two'], result: 'added' })
  assert.equal(toggleComparison([], '../x').result, 'invalid')
})

test('recent products are unique, most recent first and limited', () => {
  let recent = []
  for (let i = 0; i < 20; i++) recent = recordViewed(recent, `item-${i}`)
  assert.equal(recent.length, MAX_RECENT)
  assert.equal(recent[0], 'item-19')
  recent = recordViewed(recent, 'item-12')
  assert.equal(recent[0], 'item-12')
  assert.equal(new Set(recent).size, recent.length)
})

test('cart storage and stale-stock detection are resilient', () => {
  assert.deepEqual(cleanCart({ one: 3, two: 999, bad: -1, text: '1', '../x': 1 }), { one: 3, two: 10 })
  assert.deepEqual(cleanCart(null), {})
  const products = [{ id: 'one', stock: 2 }, { id: 'two', stock: null }]
  assert.deepEqual(cartIssues({ one: 3, two: 4, missing: 1 }, products), { unknown: ['missing'], quantity: ['one'] })
})
