import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'node:http'
import { DatabaseSync } from 'node:sqlite'
import { createStore } from '../server/database.js'
import { createApiApp } from '../server/api.js'
import { categories, products } from '../src/data.js'
import { csvCell, validateAdminProduct } from '../src/admin/shared.js'

const password = 'only-for-isolated-tests-12345'
const customer = { name: 'مشتری ساختگی', phone: '۰۹۱۲۱۲۳۴۵۶۷', city: 'تهران', address: 'یک نشانی ساختگی برای آزمایش' }
const key = '11111111-1111-4111-8111-111111111111'
const sample = { ...products[0], stock: 20, active: true }
const header = { 'Content-Type': 'application/json', 'X-Requested-With': 'DigikarenAdmin' }

async function withServer(store, options, run) {
  const server = createServer(createApiApp(store, options))
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const base = `http://127.0.0.1:${server.address().port}`
  try { await run(base) } finally { await new Promise((resolve) => server.close(resolve)) }
}
async function login(base) {
  const response = await fetch(`${base}/api/admin/session`, { method: 'POST', headers: { ...header, Origin: base }, body: JSON.stringify({ password }) })
  assert.equal(response.status, 200)
  const cookie = response.headers.get('set-cookie')
  assert.match(cookie, /HttpOnly/)
  assert.match(cookie, /SameSite=Strict/)
  assert.match(cookie, /Path=\/api\/admin/)
  return { cookie: cookie.split(';')[0], csrf: (await response.json()).csrf }
}
function authorized(session, base) { return { ...header, Origin: base, Cookie: session.cookie, 'X-Admin-CSRF': session.csrf } }


test('admin validation rejects unsafe values and CSV formula injection', () => {
  assert.equal(validateAdminProduct(sample).value.id, sample.id)
  assert.equal(validateAdminProduct({ ...sample, price: '۱۲۳٬۰۰۰', oldPrice: '۱۲۳٬۰۰۰' }).value.discount, 0)
  for (const changes of [
    { id: '../hack' }, { title: 'hi\u0000there' }, { price: -1 }, { oldPrice: 1 }, { stock: 1.5 },
    { image: 'https://evil.example/image.png' }, { image: '/images/../../x.png' },
    { categories: ['missing'] }, { subcategories: { ...sample.subcategories, bad: ['x'] } }, { features: [] },
  ]) assert.ok(validateAdminProduct({ ...sample, ...changes }).error, JSON.stringify(changes))
  assert.ok(validateAdminProduct({ ...sample, image: `/uploads/${'a'.repeat(64)}.png` }, { allowDataImage: true }).error)
  assert.equal(csvCell('=HYPERLINK("bad")'), '"\'=HYPERLINK(""bad"")"')
  assert.equal(csvCell('  +SUM(1,1)'), '"\'  +SUM(1,1)"')
})

test('old SQLite schemas migrate without erasing demo catalog or orders', () => {
  const dir = mkdtempSync(join(tmpdir(), 'dk-admin-migrate-')), file = join(dir, 'old.sqlite')
  try {
    const db = new DatabaseSync(file)
    db.exec(`CREATE TABLE catalog (id TEXT PRIMARY KEY, data_json TEXT NOT NULL, stock INTEGER NOT NULL CHECK (stock >= 0));
      CREATE TABLE demo_orders (reference TEXT PRIMARY KEY, idempotency_key TEXT NOT NULL UNIQUE, request_hash TEXT NOT NULL, customer_json TEXT NOT NULL, total INTEGER NOT NULL, item_count INTEGER NOT NULL, result_json TEXT NOT NULL, created_at TEXT NOT NULL);
      CREATE TABLE demo_order_items (order_reference TEXT NOT NULL REFERENCES demo_orders(reference), product_id TEXT NOT NULL, title TEXT NOT NULL, unit_price INTEGER NOT NULL, quantity INTEGER NOT NULL, PRIMARY KEY (order_reference, product_id));`)
    db.prepare('INSERT INTO catalog VALUES (?, ?, ?)').run(sample.id, JSON.stringify({ ...products[0], price: 12345678 }), 7)
    db.close()
    const store = createStore(file)
    try { const p = store.getAdminSnapshot().products.find((item) => item.id === sample.id); assert.equal(p.stock, 7); assert.equal(p.price, 12345678); assert.equal(p.active, true); assert.ok(p.version >= 1) } finally { store.close() }
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('admin access is disabled by default and requires a configured strong password', async () => {
  const store = createStore()
  try { await withServer(store, { adminPassword: 'short' }, async (base) => {
    const state = await (await fetch(`${base}/api/admin/session`)).json()
    assert.deepEqual(state, { enabled: false, authenticated: false })
    assert.equal((await fetch(`${base}/api/admin/snapshot`)).status, 503)
    assert.equal((await fetch(`${base}/api/admin/session`, { method: 'POST', headers: header, body: JSON.stringify({ password }) })).status, 503)
  }) } finally { store.close() }
})

test('admin sessions, CSRF, order privacy and review state are enforced', async () => {
  const store = createStore()
  try {
    const order = store.placeDemoOrder({ customer, items: [{ id: sample.id, quantity: 2, expectedPrice: sample.price }] }, key).order
    await withServer(store, { adminPassword: password }, async (base) => {
      const unauthorized = await fetch(`${base}/api/admin/snapshot`)
      assert.equal(unauthorized.status, 401)
      assert.equal(unauthorized.headers.get('cache-control'), 'no-store')
      assert.equal((await fetch(`${base}/api/admin/customers`)).status, 401)
      const wrong = await fetch(`${base}/api/admin/session`, { method: 'POST', headers: { ...header, Origin: base }, body: JSON.stringify({ password: 'wrong' }) })
      assert.equal(wrong.status, 401)
      const cross = await fetch(`${base}/api/admin/session`, { method: 'POST', headers: { ...header, Origin: 'https://evil.example' }, body: JSON.stringify({ password }) })
      assert.equal(cross.status, 403)
      const session = await login(base), h = authorized(session, base)
      const snapshot = await (await fetch(`${base}/api/admin/snapshot`, { headers: { Cookie: session.cookie } })).json()
      assert.equal(snapshot.totals.orderCount, 1)
      assert.equal(snapshot.orders[0].reviewStatus, 'new')
      assert.equal(JSON.stringify(snapshot).includes('09121234567'), false)
      assert.equal(JSON.stringify(snapshot).includes('مشتری ساختگی'), false)
      const detail = await (await fetch(`${base}/api/admin/orders/${order.reference}`, { headers: { Cookie: session.cookie } })).json()
      assert.equal(detail.order.customer.phone, '09121234567')
      const customers = await (await fetch(`${base}/api/admin/customers`, { headers: { Cookie: session.cookie } })).json()
      assert.equal(customers.customers[0].orderCount, 1)
      const denied = await fetch(`${base}/api/admin/orders/${order.reference}`, { method: 'PATCH', headers: { ...header, Origin: base, Cookie: session.cookie }, body: JSON.stringify({ reviewStatus: 'reviewed', version: 1 }) })
      assert.equal(denied.status, 403)
      const foreign = await fetch(`${base}/api/admin/orders/${order.reference}`, { method: 'PATCH', headers: { ...h, Origin: 'https://evil.example' }, body: JSON.stringify({ reviewStatus: 'reviewed', version: 1 }) })
      assert.equal(foreign.status, 403)
      const updated = await fetch(`${base}/api/admin/orders/${order.reference}`, { method: 'PATCH', headers: h, body: JSON.stringify({ reviewStatus: 'reviewing', version: 1 }) })
      assert.equal(updated.status, 200)
      assert.equal((await updated.json()).version, 2)
      const stale = await fetch(`${base}/api/admin/orders/${order.reference}`, { method: 'PATCH', headers: h, body: JSON.stringify({ reviewStatus: 'reviewed', version: 1 }) })
      assert.equal(stale.status, 409)
      assert.equal(store.placeDemoOrder({ customer, items: [{ id: sample.id, quantity: 2, expectedPrice: sample.price }] }, key).order.status, 'demo')
      assert.equal((await fetch(`${base}/api/admin/session`, { method: 'DELETE', headers: h })).status, 200)
      assert.equal((await fetch(`${base}/api/admin/snapshot`, { headers: { Cookie: session.cookie } })).status, 401)
    })
  } finally { store.close() }
})

test('admin product management persists, validates uploads and protects concurrent inventory', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'dk-admin-crud-')), file = join(dir, 'shop.sqlite'), uploadsDir = join(dir, 'uploads')
  try {
    const store = createStore(file)
    try { await withServer(store, { adminPassword: password, uploadsDir }, async (base) => {
      const session = await login(base), h = authorized(session, base)
      const category = categories.find((item) => item.id === 'lighting')
      const input = { id: 'new-test-item', title: 'کالای آزمایشی جدید', image: '/images/product-phone.jpg', price: 200000, oldPrice: 250000, stock: 9, active: true, categories: [category.id], subcategories: { [category.id]: [category.sub[0].id] }, features: ['ویژگی نمونه'] }
      const created = await fetch(`${base}/api/admin/products`, { method: 'POST', headers: h, body: JSON.stringify(input) })
      assert.equal(created.status, 201)
      let product = (await created.json()).product
      assert.equal(product.discount, 20)
      assert.ok(store.getCatalog().some((item) => item.id === input.id))
      const duplicate = await fetch(`${base}/api/admin/products`, { method: 'POST', headers: h, body: JSON.stringify(input) })
      assert.equal(duplicate.status, 409)
      const image = readFileSync(new URL('../public/favicon.png', import.meta.url))
      const upload = await fetch(`${base}/api/admin/uploads`, { method: 'POST', headers: h, body: JSON.stringify({ data: `data:image/png;base64,${image.toString('base64')}` }) })
      assert.equal(upload.status, 201)
      const uploadedPath = (await upload.json()).image
      assert.match(uploadedPath, /^\/uploads\/[a-f0-9]{64}\.png$/)
      const served = await fetch(base + uploadedPath)
      assert.equal(served.status, 200)
      assert.equal(served.headers.get('x-content-type-options'), 'nosniff')
      assert.match(served.headers.get('content-security-policy'), /sandbox/)
      const badImage = await fetch(`${base}/api/admin/uploads`, { method: 'POST', headers: h, body: JSON.stringify({ data: 'data:image/png;base64,PGh0bWw+' }) })
      assert.equal(badImage.status, 400)
      const save = await fetch(`${base}/api/admin/products/${input.id}`, { method: 'PUT', headers: h, body: JSON.stringify({ ...product, image: uploadedPath, stock: 7, active: false }) })
      assert.equal(save.status, 200)
      product = (await save.json()).product
      assert.equal(product.version, 2)
      assert.equal(product.active, false)
      assert.equal(store.getCatalog().some((item) => item.id === input.id), false)
      assert.throws(() => store.placeDemoOrder({ customer, items: [{ id: input.id, quantity: 1, expectedPrice: input.price }] }, key), { code: 'UNKNOWN_PRODUCT' })
      const stale = await fetch(`${base}/api/admin/products/${input.id}`, { method: 'PUT', headers: h, body: JSON.stringify({ ...product, version: 1, active: true }) })
      assert.equal(stale.status, 409)
      const reactivated = await fetch(`${base}/api/admin/products/${input.id}`, { method: 'PUT', headers: h, body: JSON.stringify({ ...product, active: true }) })
      assert.equal(reactivated.status, 200)
      product = (await reactivated.json()).product
      store.placeDemoOrder({ customer, items: [{ id: input.id, quantity: 1, expectedPrice: input.price }] }, key)
      const conflictAfterOrder = await fetch(`${base}/api/admin/products/${input.id}`, { method: 'PUT', headers: h, body: JSON.stringify({ ...product, stock: 15 }) })
      assert.equal(conflictAfterOrder.status, 409)
      assert.equal(store.getCatalog().find((item) => item.id === input.id).stock, 6)
      const original = store.getAdminSnapshot().products.find((item) => item.id === sample.id)
      const modified = { ...original, categories: ['lighting'], subcategories: { lighting: [category.sub[0].id] } }
      const changed = await fetch(`${base}/api/admin/products/${sample.id}`, { method: 'PUT', headers: h, body: JSON.stringify(modified) })
      assert.equal(changed.status, 200)
    }) } finally { store.close() }
    const reopened = createStore(file)
    try {
      const p = reopened.getAdminSnapshot().products.find((item) => item.id === 'new-test-item')
      assert.equal(p.stock, 6)
      assert.ok(p.image.startsWith('/uploads/'))
      assert.deepEqual(reopened.getCatalog().find((item) => item.id === sample.id).categories, ['lighting'])
      assert.equal(reopened.listDemoOrders().length, 1)
    } finally { reopened.close() }
  } finally { rmSync(dir, { recursive: true, force: true }) }
})
