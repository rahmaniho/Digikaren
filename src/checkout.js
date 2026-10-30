// An idempotency key survives a reload of the same tab without storing checkout fields there.
const storageKey = 'digikaren-pending-demo-order'
let inMemoryPending = null

function randomKey() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  if (!globalThis.crypto?.getRandomValues) throw new Error('برای ثبت سفارش آزمایشی به مرورگری با اتصال امن نیاز است.')
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 15) | 64
  bytes[8] = (bytes[8] & 63) | 128
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export async function keyForCheckout(body) {
  const serialized = JSON.stringify(body)
  let fingerprint = serialized
  let safeToPersist = false
  try {
    const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(serialized))
    fingerprint = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
    safeToPersist = true
  } catch { /* Without Web Crypto, keep the pending fingerprint in memory only. */ }
  let pending = inMemoryPending
  if (safeToPersist) {
    try { pending = JSON.parse(sessionStorage.getItem(storageKey)) || pending } catch { /* Storage is optional. */ }
  }
  if (pending?.fingerprint === fingerprint && /^[a-zA-Z0-9-]{16,80}$/.test(pending.key)) return pending.key
  pending = { fingerprint, key: randomKey() }
  inMemoryPending = pending
  if (safeToPersist) {
    try { sessionStorage.setItem(storageKey, JSON.stringify(pending)) } catch { /* Storage is optional. */ }
  }
  return pending.key
}

export function clearCheckoutKey() {
  inMemoryPending = null
  try { sessionStorage.removeItem(storageKey) } catch { /* Storage is optional. */ }
}
