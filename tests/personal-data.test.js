import test from 'node:test'
import assert from 'node:assert/strict'
import { cleanNotes, putNote, cleanReceipts, recordReceipt, MAX_NOTES, MAX_NOTE_LENGTH, MAX_RECEIPTS } from '../src/personal-data.js'
import { MAX_ORDER_ITEMS, MAX_QUANTITY } from '../src/cart-limits.js'

const makeReceipt = (index = 1) => ({
  reference: `DK-${index.toString(16).toUpperCase().padStart(16, '0')}`,
  createdAt: '2026-10-30T09:00:00.000Z', status: 'demo', total: 300000, itemCount: 3,
  items: [{ id: 'desk-lamp', title: 'چراغ نمونه', unitPrice: 100000, quantity: 3 }],
  customer: { name: 'Do not store', phone: '09121234567', address: 'Do not store' },
  idempotencyKey: 'secret',
})

test('personal notes are bounded and malformed browser storage is safely ignored', () => {
  assert.deepEqual(cleanNotes(null), {})
  assert.deepEqual(cleanNotes(['not a map']), {})
  assert.deepEqual(cleanNotes({ '../x': 'bad id', 'desk-lamp': '  خرید برای اتاق  ', wrong: 42, empty: '  ' }), { 'desk-lamp': 'خرید برای اتاق' })
  assert.equal(cleanNotes({ one: 'x'.repeat(MAX_NOTE_LENGTH + 100) }).one.length, MAX_NOTE_LENGTH)
  const full = Object.fromEntries(Array.from({ length: MAX_NOTES }, (_, index) => [`item-${index}`, 'یادداشت']))
  assert.equal(putNote(full, 'item-new', 'متن').result, 'full')
  assert.equal(putNote(full, 'item-0', 'ویرایش').result, 'saved')
  assert.equal(putNote({}, 'item', ' '.repeat(10)).result, 'invalid')
  assert.equal(putNote({}, 'item', 'x'.repeat(MAX_NOTE_LENGTH + 1)).result, 'invalid')
})

test('demo receipts retain only validated public summaries, never customer fields', () => {
  const stored = recordReceipt([], makeReceipt()).receipts
  assert.equal(stored.length, 1)
  assert.equal(stored[0].items[0].title, 'چراغ نمونه')
  assert.equal(JSON.stringify(stored).includes('09121234567'), false)
  assert.equal(JSON.stringify(stored).includes('customer'), false)
  assert.equal(JSON.stringify(stored).includes('idempotencyKey'), false)
  assert.equal(cleanReceipts([makeReceipt(), makeReceipt()]).length, 1)
  assert.deepEqual(cleanReceipts([{ ...makeReceipt(), total: 1 }, { ...makeReceipt(), status: 'paid' }, { ...makeReceipt(), createdAt: 'broken' }]), [])
  assert.deepEqual(cleanReceipts([{ ...makeReceipt(), items: [{ ...makeReceipt().items[0], quantity: 999 }] }]), [])
  assert.equal(recordReceipt([], { ...makeReceipt(), total: -1 }).result, 'invalid')
  const many = Array.from({ length: MAX_RECEIPTS + 5 }, (_, index) => makeReceipt(index + 1))
  assert.equal(cleanReceipts(many).length, MAX_RECEIPTS)
  const updated = recordReceipt(many, makeReceipt(50)).receipts
  assert.equal(updated[0].reference, makeReceipt(50).reference)
  assert.equal(updated.length, MAX_RECEIPTS)
})

test('receipt totals, item identities and limits must remain internally consistent', () => {
  const receipt = makeReceipt()
  const invalid = [
    { ...receipt, reference: 'DK-not-valid' },
    { ...receipt, itemCount: 2 },
    { ...receipt, total: Number.MAX_SAFE_INTEGER + 1 },
    { ...receipt, items: [receipt.items[0], receipt.items[0]] },
    { ...receipt, items: [{ ...receipt.items[0], id: '../invalid' }] },
    { ...receipt, items: [{ ...receipt.items[0], title: 'bad\u0000title' }] },
    { ...receipt, items: [{ ...receipt.items[0], quantity: MAX_QUANTITY + 1 }] },
    { ...receipt, items: Array.from({ length: MAX_ORDER_ITEMS + 1 }, (_, i) => ({ ...receipt.items[0], id: `item-${i}` })) },
  ]
  assert.deepEqual(cleanReceipts(invalid), [])
})
