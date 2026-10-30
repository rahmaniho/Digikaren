import test from 'node:test'
import assert from 'node:assert/strict'

test('retry key survives reload for identical checkout without storing form fields', async () => {
  const saved = globalThis.sessionStorage
  const values = new Map()
  globalThis.sessionStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  }
  try {
    const firstModule = await import('../src/checkout.js?first')
    const body = { customer: { name: 'مشتری تستی', phone: '09120000000', city: 'تهران', address: 'نشانی آزمایشی ساختگی' }, items: [{ id: 'phone-pro', quantity: 1, expectedPrice: 18990000 }] }
    const first = await firstModule.keyForCheckout(body)
    assert.match(first, /^[a-zA-Z0-9-]{16,80}$/)
    assert.equal([...values.values()].join('').includes(body.customer.phone), false)
    assert.equal([...values.values()].join('').includes(body.customer.address), false)
    const afterReload = await import('../src/checkout.js?reloaded')
    assert.equal(await afterReload.keyForCheckout(structuredClone(body)), first)
    const changed = { ...body, items: [{ ...body.items[0], quantity: 2 }] }
    assert.notEqual(await afterReload.keyForCheckout(changed), first)
    afterReload.clearCheckoutKey()
    assert.equal(values.size, 0)
  } finally {
    if (saved === undefined) delete globalThis.sessionStorage
    else globalThis.sessionStorage = saved
  }
})
