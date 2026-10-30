import test from 'node:test'
import assert from 'node:assert/strict'
import { MAX_QUANTITY, productQuantityLimit, quantityAvailableToAdd } from '../src/cart-limits.js'

test('quantity limits respect stock, existing cart quantity and the server maximum', () => {
  assert.equal(productQuantityLimit(null), 0)
  assert.equal(productQuantityLimit({}), MAX_QUANTITY)
  assert.equal(productQuantityLimit({ stock: 20 }), MAX_QUANTITY)
  assert.equal(productQuantityLimit({ stock: 2 }), 2)
  assert.equal(productQuantityLimit({ stock: 0 }), 0)
  assert.equal(productQuantityLimit({ stock: -5 }), 0)
  assert.equal(productQuantityLimit({ stock: '20' }), 0)
  assert.equal(quantityAvailableToAdd({ stock: 20 }, 3), 7)
  assert.equal(quantityAvailableToAdd({ stock: 2 }, 1), 1)
  assert.equal(quantityAvailableToAdd({ stock: 2 }, 8), 0)
})
