import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'node:http'
import { DatabaseSync } from 'node:sqlite'
import { categories, products as seedProducts } from '../src/data.js'
import { createStore } from '../server/database.js'
import { createApiApp } from '../server/api.js'

const customer = { name: 'مشتری آزمایشی', phone: '۰۹۱۲۱۲۳۴۵۶۷', city: 'تهران', address: 'نشانی ساختگی برای آزمایش فروشگاه' }
const key = '9f7ba44a-974d-4d2d-890e-0ea1671a5801'
const makeBody = (product, quantity = 1) => ({ customer, items: [{ id: product.id, quantity, expectedPrice: product.price }] })

test('catalog and demo orders persist; retries do not duplicate orders or inventory changes', () => {
  const dir = mkdtempSync(join(tmpdir(), 'digikaren-test-'))
  const filename = join(dir, 'store.sqlite')
  try {
    const store = createStore(filename)
    const product = store.getCatalog()[0]
    const body = makeBody(product, 2)
    const first = store.placeDemoOrder(body, key)
    assert.equal(first.order.total, product.price * 2)
    assert.equal(first.order.itemCount, 2)
    assert.equal(first.order.status, 'demo')
    assert.equal(first.replayed, false)
    assert.equal(store.getCatalog()[0].stock, 18)
    assert.equal(store.listDemoOrders().length, 1)
    store.close()

    const reopened = createStore(filename)
    try {
      assert.equal(reopened.getCatalog()[0].stock, 18)
      const retry = reopened.placeDemoOrder(body, key)
      assert.equal(retry.replayed, true)
      assert.equal(retry.order.reference, first.order.reference)
      assert.equal(reopened.getCatalog()[0].stock, 18)
      assert.throws(() => reopened.placeDemoOrder(makeBody(product, 3), key), { code: 'KEY_REUSED', status: 409 })
      assert.equal(reopened.listDemoOrders().length, 1)
      assert.equal(JSON.stringify(reopened.listDemoOrders()).includes(customer.phone), false)
    } finally { reopened.close() }
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('legacy catalog taxonomy is upgraded without resetting stock, prices or orders', () => {
  const dir = mkdtempSync(join(tmpdir(), 'digikaren-migrate-'))
  const filename = join(dir, 'store.sqlite')
  try {
    const original = createStore(filename)
    const product = original.getCatalog()[0]
    original.placeDemoOrder(makeBody(product, 2), key)
    original.close()
    const legacy = new DatabaseSync(filename)
    legacy.prepare("UPDATE catalog SET data_json = json_remove(json_set(data_json, '$.price', 12345678), '$.subcategories') WHERE id = ?").run(product.id)
    legacy.close()
    const migrated = createStore(filename)
    try {
      const updated = migrated.getCatalog().find((item) => item.id === product.id)
      assert.equal(updated.stock, 18)
      assert.equal(updated.price, 12345678)
      assert.deepEqual(updated.subcategories, seedProducts[0].subcategories)
      assert.equal(migrated.listDemoOrders().length, 1)
      assert.equal(migrated.getCatalog().length, seedProducts.length)
    } finally { migrated.close() }
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('expanded seed adds products and updates cross-listing while preserving an existing laptop order', () => {
  const dir = mkdtempSync(join(tmpdir(), 'digikaren-expand-'))
  const filename = join(dir, 'store.sqlite')
  try {
    const previous = createStore(filename)
    const laptop = previous.getCatalog().find((item) => item.id === 'convertible')
    previous.placeDemoOrder(makeBody(laptop, 2), key)
    previous.close()

    // Simulate the previous catalog before the new departments and products existed.
    const legacy = new DatabaseSync(filename)
    legacy.prepare(`UPDATE catalog SET data_json = json_set(data_json, '$.price', 12345678, '$.categories', json('["digital"]'), '$.subcategories', json('{"digital":["laptops","tablets","accessories"]}')) WHERE id = ?`).run(laptop.id)
    legacy.prepare('DELETE FROM catalog WHERE id IN (?, ?)').run('pet-care-kit', 'network-router')
    legacy.close()

    const upgraded = createStore(filename)
    try {
      const catalog = upgraded.getCatalog()
      const updated = catalog.find((item) => item.id === laptop.id)
      assert.equal(updated.stock, 18)
      assert.equal(updated.price, 12345678)
      assert.deepEqual(updated.categories, ['digital', 'computer'])
      assert.deepEqual(updated.subcategories.computer, ['laptops'])
      assert.equal(upgraded.listDemoOrders().length, 1)
      assert.equal(catalog.find((item) => item.id === 'pet-care-kit').stock, 20)
      assert.equal(catalog.find((item) => item.id === 'network-router').stock, 20)
      assert.equal(catalog.length, seedProducts.length)
    } finally { upgraded.close() }
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('server rejects manipulated price, invalid quantities and stale inventory without partial changes', () => {
  const store = createStore()
  try {
    const [one, two] = store.getCatalog()
    assert.throws(() => store.placeDemoOrder({ ...makeBody(one), items: [{ id: one.id, quantity: 1, expectedPrice: 1 }] }, key), { code: 'PRICE_CHANGED', status: 409 })
    assert.throws(() => store.placeDemoOrder(makeBody(one, -1), key), { code: 'INVALID_ORDER' })
    assert.throws(() => store.placeDemoOrder({ customer, items: [{ id: one.id, quantity: 1, expectedPrice: one.price }, { id: one.id, quantity: 1, expectedPrice: one.price }] }, key), { code: 'INVALID_ORDER' })
    assert.throws(() => store.placeDemoOrder({ ...makeBody(one), customer: { ...customer, phone: 'not-a-phone' } }, key), { code: 'INVALID_ORDER' })
    assert.throws(() => store.placeDemoOrder(makeBody(one), 'short'), { code: 'INVALID_KEY' })
    store.placeDemoOrder(makeBody(one, 10), '11111111-1111-4111-8111-111111111111')
    store.placeDemoOrder(makeBody(one, 10), '22222222-2222-4222-8222-222222222222')
    const both = { customer, items: [{ id: two.id, quantity: 1, expectedPrice: two.price }, { id: one.id, quantity: 1, expectedPrice: one.price }] }
    assert.throws(() => store.placeDemoOrder(both, key), { code: 'OUT_OF_STOCK', status: 409 })
    assert.equal(store.getCatalog().find((item) => item.id === two.id).stock, 20)
    assert.equal(store.listDemoOrders().length, 2)
  } finally { store.close() }
})

test('demo API validates requests and never exposes contact details in responses', async () => {
  const store = createStore()
  const server = createServer(createApiApp(store))
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const url = `http://127.0.0.1:${server.address().port}`
  try {
    const catalogResponse = await fetch(`${url}/api/catalog`)
    assert.equal(catalogResponse.status, 200)
    assert.equal(catalogResponse.headers.get('cache-control'), 'no-store')
    const { products, mode } = await catalogResponse.json()
    assert.equal(mode, 'demo')
    const categoryResponse = await fetch(`${url}/api/categories`)
    const categoryData = await categoryResponse.json()
    assert.equal(categoryData.categories.length, categories.length)
    assert.ok(categoryData.categories.every((category) => category.count > 0 && category.sub.every((item) => item.count > 0)))
    const send = (data, options = {}) => fetch(`${url}/api/demo-orders`, { method: 'POST', headers: { 'content-type': 'application/json', 'idempotency-key': key }, body: JSON.stringify(data), ...options })
    const response = await send(makeBody(products[0]))
    assert.equal(response.status, 201)
    const text = await response.text()
    assert.equal(text.includes(customer.phone), false)
    assert.equal(JSON.parse(text).order.total, products[0].price)
    const retry = await send(makeBody(products[0]))
    assert.equal(retry.status, 200)
    assert.equal((await retry.json()).replayed, true)
    const bad = await send(makeBody(products[0], 0))
    assert.equal(bad.status, 400)
    const wrongContent = await fetch(`${url}/api/demo-orders`, { method: 'POST', headers: { 'content-type': 'text/plain' }, body: '{}' })
    assert.equal(wrongContent.status, 415)
    assert.equal((await fetch(`${url}/api/missing`)).status, 404)
  } finally {
    await new Promise((resolve) => server.close(resolve))
    store.close()
  }
})
