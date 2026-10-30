import test from 'node:test'
import assert from 'node:assert/strict'
import { products } from '../src/data.js'
import { viewFromSearch, viewUrl } from '../src/navigation.js'
import { getSandboxCustomers, getSandboxOrder, getSandboxSnapshot, loadSandbox, resetSandbox, saveSandboxProduct, updateSandboxOrder } from '../src/admin/sandbox.js'

const KEY = 'digikaren-admin-sandbox-v1'
function mockStorage(t) {
  const original = globalThis.localStorage
  const values = new Map()
  globalThis.localStorage = {
    getItem(key) { return values.get(key) ?? null },
    setItem(key, value) { values.set(key, String(value)) },
    removeItem(key) { values.delete(key) },
  }
  t.after(() => { if (original === undefined) delete globalThis.localStorage; else globalThis.localStorage = original })
  return values
}

test('admin routes are bounded and round-trip at a Pages subpath', () => {
  assert.deepEqual(viewFromSearch('?admin=orders'), { type: 'admin', section: 'orders' })
  assert.deepEqual(viewFromSearch('?admin=unknown'), { type: 'admin', section: 'overview' })
  assert.equal(viewUrl({ type: 'admin', section: 'inventory' }, '/Digikaren/'), '/Digikaren/?admin=inventory')
  assert.equal(viewUrl({ type: 'admin', section: '../../bad' }, '/Digikaren/'), '/Digikaren/?admin=overview')
})

test('browser sandbox persists locally and exposes personal-looking sample details only on demand', (t) => {
  mockStorage(t)
  const initial = loadSandbox()
  assert.equal(initial.storage, true)
  assert.equal(initial.state.products.length, products.length)
  const summary = getSandboxSnapshot(initial.state)
  assert.equal(summary.orders.length, 14)
  assert.equal(JSON.stringify(summary.orders).includes('customer'), false)
  const ref = summary.orders[0].reference
  assert.match(getSandboxOrder(initial.state, ref).customer.name, /نمونه/)
  assert.ok(getSandboxCustomers(initial.state).length > 0)
  const product = { ...initial.state.products[0], title: 'کالای تمرینی آزمون', stock: 7 }
  const saved = saveSandboxProduct(initial.state, product, false)
  assert.ok(saved.product)
  const updated = updateSandboxOrder(saved.state, ref, 'reviewed', 1)
  assert.equal(updated.version, 2)
  const reloaded = loadSandbox().state
  assert.equal(reloaded.products.find((item) => item.id === product.id).stock, 7)
  assert.equal(getSandboxOrder(reloaded, ref).reviewStatus, 'reviewed')
  assert.equal(reloaded.activities.length, 2)
})

test('stale sandbox tabs cannot overwrite a newer product or order and unrelated edits merge', (t) => {
  mockStorage(t)
  const first = loadSandbox().state
  const otherTab = loadSandbox().state
  const productA = first.products[0]
  const productB = first.products[1]
  assert.ok(saveSandboxProduct(first, { ...productA, stock: 2 }, false).product)
  assert.match(saveSandboxProduct(otherTab, { ...productA, stock: 9 }, false).error, /نسخه/)
  assert.ok(saveSandboxProduct(otherTab, { ...productB, stock: 3 }, false).product)
  const persisted = loadSandbox().state
  assert.equal(persisted.products.find((item) => item.id === productA.id).stock, 2)
  assert.equal(persisted.products.find((item) => item.id === productB.id).stock, 3)
  const ref = getSandboxSnapshot(persisted).orders[0].reference
  assert.ok(updateSandboxOrder(persisted, ref, 'reviewed', 1).state)
  assert.match(updateSandboxOrder(otherTab, ref, 'archived', 1).error, /نسخه/)
  assert.equal(getSandboxOrder(loadSandbox().state, ref).reviewStatus, 'reviewed')
})

test('sandbox storage errors, corrupt state and failed resets do not silently lose data', (t) => {
  const values = mockStorage(t)
  const initial = loadSandbox()
  const before = values.get(KEY)
  globalThis.localStorage.setItem = () => { throw new Error('quota') }
  assert.ok(resetSandbox().error)
  assert.equal(values.get(KEY), before)
  assert.ok(saveSandboxProduct(initial.state, { ...initial.state.products[0], stock: 1 }, false).error)
  globalThis.localStorage.setItem = (key, value) => values.set(key, String(value))
  values.set(KEY, '{invalid')
  const recovered = loadSandbox()
  assert.equal(recovered.recovered, true)
  assert.ok(saveSandboxProduct(recovered.state, recovered.state.products[0], false).error)
  assert.equal(values.get(KEY), '{invalid')
  assert.ok(resetSandbox().state)
  assert.equal(loadSandbox().recovered, undefined)
  globalThis.localStorage.getItem = () => { throw new Error('blocked') }
  assert.equal(loadSandbox().storage, false)
})
