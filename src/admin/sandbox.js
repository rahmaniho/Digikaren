import { products as seedProducts } from '../data.js'
import { MAX_ADMIN_ACTIVITY, MAX_ADMIN_ORDERS, MAX_ADMIN_PRODUCTS, ORDER_REVIEW_STATES, validateAdminProduct } from './shared.js'

const KEY = 'digikaren-admin-sandbox-v1'
const names = ['مشتری نمونه یک', 'مشتری نمونه دو', 'مشتری نمونه سه', 'مشتری نمونه چهار', 'مشتری نمونه پنج']
const cities = ['تهران', 'شیراز', 'اصفهان', 'مشهد', 'رشت']
const pattern = [24, 13, 7, 3, 0, 18, 28, 6, 2, 11]

function seedState() {
  return {
    schema: 1,
    startedAt: new Date().toISOString(),
    products: seedProducts.map((product, index) => ({ ...product, stock: pattern[index % pattern.length], active: true, version: 1 })),
    orderStates: {},
    activities: [],
  }
}

function sampleOrders(startedAt, orderStates) {
  const offsets = [0, 0, 1, 1, 2, 3, 4, 5, 7, 9, 12, 16, 21, 26]
  return offsets.map((daysAgo, index) => {
    const product = seedProducts[(index * 7 + 2) % seedProducts.length]
    const quantity = index % 4 === 1 ? 2 : 1
    const createdAt = new Date(Date.parse(startedAt) - daysAgo * 86400000 - index * 37 * 60000).toISOString()
    const reference = `DK-${(index + 1).toString(16).toUpperCase().padStart(16, '0')}`
    const status = orderStates[reference]
    return {
      reference, createdAt, status: 'demo', total: product.price * quantity, itemCount: quantity,
      items: [{ id: product.id, title: product.title, unitPrice: product.price, quantity }],
      customer: { name: names[index % names.length], phone: `0900000000${index % names.length}`, city: cities[index % cities.length], address: 'نشانی کاملاً ساختگی برای تمرین' },
      reviewStatus: status?.reviewStatus || ['new', 'reviewing', 'reviewed', 'archived'][index % 4],
      version: status?.version || 1,
    }
  })
}

function cleanState(value) {
  if (!value || value.schema !== 1 || typeof value.startedAt !== 'string' || !Number.isFinite(Date.parse(value.startedAt)) || !Array.isArray(value.products) || !value.products.length || value.products.length > MAX_ADMIN_PRODUCTS) return null
  const ids = new Set()
  const products = []
  for (const entry of value.products) {
    const validated = validateAdminProduct(entry, { allowDataImage: true })
    if (!validated.value || ids.has(validated.value.id) || !Number.isSafeInteger(entry.version) || entry.version < 1) return null
    ids.add(validated.value.id)
    const original = seedProducts.find((product) => product.id === validated.value.id)
    products.push({ ...(original || { rating: '۰', reviews: 0, sold: 0, badge: 'کالای نمونه' }), ...validated.value, version: entry.version })
  }
  const statuses = {}
  if (value.orderStates && typeof value.orderStates === 'object' && !Array.isArray(value.orderStates)) {
    for (const [reference, entry] of Object.entries(value.orderStates).slice(0, 30)) {
      if (/^DK-[0-9A-F]{16}$/.test(reference) && ORDER_REVIEW_STATES.includes(entry?.reviewStatus) && Number.isSafeInteger(entry.version) && entry.version > 0) statuses[reference] = { reviewStatus: entry.reviewStatus, version: entry.version }
    }
  }
  const activities = Array.isArray(value.activities) ? value.activities.slice(0, MAX_ADMIN_ACTIVITY).filter((entry) => entry && ['product_created', 'product_updated', 'product_visibility', 'order_review'].includes(entry.action) && typeof entry.entityId === 'string' && entry.entityId.length <= 80 && typeof entry.label === 'string' && entry.label.length <= 160 && Number.isFinite(Date.parse(entry.createdAt))).map((entry, index) => ({ id: index + 1, action: entry.action, entityId: entry.entityId, label: entry.label, createdAt: entry.createdAt })) : []
  return { schema: 1, startedAt: new Date(value.startedAt).toISOString(), products, orderStates: statuses, activities }
}

export function loadSandbox() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      let state = null
      try { state = cleanState(JSON.parse(raw)) } catch { /* Corrupt contents are not a storage-access failure. */ }
      if (state) return { state, storage: true }
      return { state: seedState(), storage: true, recovered: true }
    }
    const state = seedState()
    localStorage.setItem(KEY, JSON.stringify(state))
    return { state, storage: true }
  } catch { return { state: seedState(), storage: false } }
}

function persist(state) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); return true } catch { return false }
}
function log(state, action, entityId, label) {
  return [{ id: Date.now(), action, entityId, label, createdAt: new Date().toISOString() }, ...state.activities].slice(0, MAX_ADMIN_ACTIVITY)
}
function failed(message) { return { error: message } }

// Re-read before each change so a stale tab does not overwrite other changes.
// localStorage is not a transactional multi-user database; this is only a
// best-effort safeguard for the isolated practice environment.
function latestState(previous) {
  try {
    const raw = localStorage.getItem(KEY)
    const state = raw ? cleanState(JSON.parse(raw)) : null
    if (!state || state.startedAt !== previous.startedAt) return failed('اطلاعات تمرینی تغییر کرده‌اند؛ پنل را به‌روز کنید.')
    return { state }
  } catch { return failed('دسترسی به حافظهٔ مرورگر ممکن نیست؛ پنل را به‌روز کنید.') }
}

export function saveSandboxProduct(state, input, isNew) {
  const result = validateAdminProduct(input, { allowDataImage: true })
  if (result.error) return failed(result.error)
  const latest = latestState(state)
  if (latest.error) return latest
  state = latest.state
  const value = result.value
  const previous = state.products.find((product) => product.id === value.id)
  if (isNew && previous) return failed('این شناسهٔ کالا قبلاً ثبت شده است.')
  if (!isNew && !previous) return failed('کالا پیدا نشد.')
  if (!isNew && input.version !== previous.version) return failed('نسخهٔ کالا تغییر کرده است؛ پنل را به‌روز کنید.')
  if (isNew && state.products.length >= MAX_ADMIN_PRODUCTS) return failed('حداکثر تعداد کالاهای محیط تمرینی تکمیل شده است.')
  const product = { ...(previous || { rating: '۰', reviews: 0, sold: 0, badge: 'کالای نمونه' }), ...value, version: previous ? previous.version + 1 : 1 }
  const action = isNew ? 'product_created' : previous.active !== product.active ? 'product_visibility' : 'product_updated'
  const next = { ...state, products: isNew ? [product, ...state.products] : state.products.map((item) => item.id === product.id ? product : item), activities: log(state, action, product.id, product.title) }
  return persist(next) ? { state: next, product } : failed('ذخیره در مرورگر ممکن نیست؛ فضای ذخیره‌سازی یا تنظیمات مرورگر را بررسی کنید.')
}

export function updateSandboxOrder(state, reference, reviewStatus, version) {
  const latest = latestState(state)
  if (latest.error) return latest
  state = latest.state
  const order = sampleOrders(state.startedAt, state.orderStates).find((item) => item.reference === reference)
  if (!order || !ORDER_REVIEW_STATES.includes(reviewStatus)) return failed('سفارش یا وضعیت بررسی معتبر نیست.')
  if (order.version !== version) return failed('نسخهٔ سفارش تغییر کرده است؛ پنل را به‌روز کنید.')
  const next = { ...state, orderStates: { ...state.orderStates, [reference]: { reviewStatus, version: version + 1 } }, activities: log(state, 'order_review', reference, reviewStatus) }
  return persist(next) ? { state: next, version: version + 1 } : failed('ذخیره در مرورگر ممکن نیست؛ تنظیمات مرورگر را بررسی کنید.')
}

export function resetSandbox() {
  try { const state = seedState(); localStorage.setItem(KEY, JSON.stringify(state)); return { state } } catch { return failed('بازنشانی در مرورگر ممکن نیست.') }
}
export function getSandboxOrder(state, reference) { return sampleOrders(state.startedAt, state.orderStates).find((item) => item.reference === reference) || null }

export function getSandboxCustomers(state) {
  const map = new Map()
  for (const order of sampleOrders(state.startedAt, state.orderStates)) {
    const { phone, name, city } = order.customer
    const entry = map.get(phone) || { phone, name, city, orderCount: 0, orderValue: 0, lastOrder: order.createdAt }
    entry.orderCount++; entry.orderValue += order.total
    if (order.createdAt > entry.lastOrder) entry.lastOrder = order.createdAt
    map.set(phone, entry)
  }
  return [...map.values()]
}

export function getSandboxSnapshot(state) {
  const all = sampleOrders(state.startedAt, state.orderStates)
  const totals = { orderCount: all.length, orderValue: all.reduce((sum, order) => sum + order.total, 0), pendingCount: all.filter((order) => ['new', 'reviewing'].includes(order.reviewStatus)).length }
  const top = new Map()
  for (const order of all) for (const item of order.items) {
    const entry = top.get(item.id) || { id: item.id, title: item.title, quantity: 0, value: 0 }
    entry.quantity += item.quantity; entry.value += item.quantity * item.unitPrice; top.set(item.id, entry)
  }
  return {
    products: state.products, orders: all.slice(0, MAX_ADMIN_ORDERS).map(({ customer, items, status, ...summary }) => summary), totals,
    topProducts: [...top.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 5), activities: state.activities, orderLimit: MAX_ADMIN_ORDERS,
  }
}
