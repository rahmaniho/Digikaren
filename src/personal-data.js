import { MAX_ORDER_ITEMS, MAX_QUANTITY } from './cart-limits.js'
import { isProductId } from './comparison.js'

export const MAX_NOTES = 50
export const MAX_NOTE_LENGTH = 500
export const MAX_RECEIPTS = 20

// Browser storage is untrusted and optional. Keep only small, text-only notes.
export function cleanNotes(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(Object.entries(value)
    .filter(([id, text]) => isProductId(id) && typeof text === 'string' && text.trim())
    .slice(0, MAX_NOTES)
    .map(([id, text]) => [id, text.slice(0, MAX_NOTE_LENGTH).trim()])
    .filter(([, text]) => text))
}

export function putNote(value, id, text) {
  const notes = cleanNotes(value)
  if (!isProductId(id) || typeof text !== 'string' || !text.trim() || text.length > MAX_NOTE_LENGTH) return { notes, result: 'invalid' }
  if (!Object.hasOwn(notes, id) && Object.keys(notes).length >= MAX_NOTES) return { notes, result: 'full' }
  return { notes: { ...notes, [id]: text.trim() }, result: 'saved' }
}

function cleanReceipt(receipt) {
  if (!receipt || typeof receipt !== 'object' || Array.isArray(receipt)) return null
  if (!/^DK-[0-9A-F]{16}$/.test(receipt.reference) || receipt.status !== 'demo') return null
  if (typeof receipt.createdAt !== 'string' || receipt.createdAt.length !== 24) return null
  const time = Date.parse(receipt.createdAt)
  if (!Number.isFinite(time) || new Date(time).toISOString() !== receipt.createdAt) return null
  if (!Array.isArray(receipt.items) || receipt.items.length < 1 || receipt.items.length > MAX_ORDER_ITEMS) return null
  const seen = new Set()
  let total = 0
  let itemCount = 0
  const items = []
  for (const item of receipt.items) {
    if (!item || typeof item !== 'object' || !isProductId(item.id) || seen.has(item.id)) return null
    if (typeof item.title !== 'string' || !item.title.trim() || item.title.length > 200 || /[\u0000-\u001f\u007f]/.test(item.title)) return null
    if (!Number.isSafeInteger(item.unitPrice) || item.unitPrice < 1 || !Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > MAX_QUANTITY) return null
    seen.add(item.id)
    total += item.unitPrice * item.quantity
    itemCount += item.quantity
    if (!Number.isSafeInteger(total)) return null
    items.push({ id: item.id, title: item.title.trim(), unitPrice: item.unitPrice, quantity: item.quantity })
  }
  if (total !== receipt.total || itemCount !== receipt.itemCount) return null
  // Only public product details and the demo reference are retained. Customer
  // name, phone, address, idempotency key and any other extra fields are dropped.
  return { reference: receipt.reference, createdAt: receipt.createdAt, status: 'demo', total, itemCount, items }
}

export function cleanReceipts(value) {
  if (!Array.isArray(value)) return []
  const seen = new Set()
  const receipts = []
  for (const entry of value) {
    const receipt = cleanReceipt(entry)
    if (!receipt || seen.has(receipt.reference)) continue
    seen.add(receipt.reference)
    receipts.push(receipt)
    if (receipts.length === MAX_RECEIPTS) break
  }
  return receipts
}

export function recordReceipt(value, receipt) {
  const sanitized = cleanReceipt(receipt)
  if (!sanitized) return { receipts: cleanReceipts(value), result: 'invalid' }
  return { receipts: cleanReceipts([sanitized, ...cleanReceipts(value).filter((item) => item.reference !== sanitized.reference)]), result: 'saved' }
}
