import { DatabaseSync } from 'node:sqlite'
import { createHash, randomBytes } from 'node:crypto'
import { chmodSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { products as seedProducts } from '../src/data.js'
import { MAX_ORDER_ITEMS, MAX_QUANTITY } from '../src/cart-limits.js'

export { MAX_QUANTITY }

export class OrderError extends Error {
  constructor(code, message, status = 400) {
    super(message)
    this.code = code
    this.status = status
  }
}

function digits(value) {
  return value.replace(/[۰-۹٠-٩]/g, (char) => {
    const persian = '۰۱۲۳۴۵۶۷۸۹'.indexOf(char)
    return String(persian < 0 ? '٠١٢٣٤٥٦٧٨٩'.indexOf(char) : persian)
  })
}

function field(value, label, min, max) {
  if (typeof value !== 'string') throw new OrderError('INVALID_ORDER', `${label} را کامل کنید.`)
  const clean = value.trim().replace(/\s+/g, ' ')
  if (clean.length < min || clean.length > max || /[\u0000-\u001f\u007f]/.test(clean)) {
    throw new OrderError('INVALID_ORDER', `${label} معتبر نیست.`)
  }
  return clean
}

function validateOrder(body, key) {
  if (typeof key !== 'string' || !/^[a-zA-Z0-9-]{16,80}$/.test(key)) {
    throw new OrderError('INVALID_KEY', 'شناسه درخواست معتبر نیست؛ دوباره تلاش کنید.')
  }
  if (!body || typeof body !== 'object' || Array.isArray(body) || !Array.isArray(body.items) || body.items.length < 1 || body.items.length > MAX_ORDER_ITEMS) {
    throw new OrderError('INVALID_ORDER', 'سبد خرید معتبر نیست.')
  }
  if (!body.customer || typeof body.customer !== 'object' || Array.isArray(body.customer)) {
    throw new OrderError('INVALID_ORDER', 'اطلاعات گیرنده را کامل کنید.')
  }
  const customer = {
    name: field(body.customer.name, 'نام گیرنده', 2, 80),
    phone: digits(field(body.customer.phone, 'شماره موبایل', 11, 11)),
    city: field(body.customer.city, 'شهر', 2, 60),
    address: field(body.customer.address, 'نشانی', 10, 300),
  }
  if (!/^09\d{9}$/.test(customer.phone)) throw new OrderError('INVALID_ORDER', 'شماره موبایل معتبر نیست.')
  const seen = new Set()
  const items = body.items.map((item) => {
    if (!item || typeof item !== 'object' || typeof item.id !== 'string' || !/^[a-z0-9-]{1,50}$/.test(item.id) || seen.has(item.id) || !Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > MAX_QUANTITY || !Number.isSafeInteger(item.expectedPrice) || item.expectedPrice < 1) {
      throw new OrderError('INVALID_ORDER', 'کالا یا تعداد انتخاب‌شده معتبر نیست.')
    }
    seen.add(item.id)
    return { id: item.id, quantity: item.quantity, expectedPrice: item.expectedPrice }
  }).sort((a, b) => a.id.localeCompare(b.id))
  return { customer, items }
}

export function createStore(filename = ':memory:') {
  if (filename !== ':memory:') mkdirSync(dirname(filename), { recursive: true, mode: 0o700 })
  const db = new DatabaseSync(filename)
  if (filename !== ':memory:') {
    // The demonstration database can contain the test contact information entered at checkout.
    try { chmodSync(filename, 0o600) } catch { /* Filesystems without POSIX permissions. */ }
  }
  db.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 3000;
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS catalog (
      id TEXT PRIMARY KEY,
      data_json TEXT NOT NULL,
      stock INTEGER NOT NULL CHECK (stock >= 0)
    );
    CREATE TABLE IF NOT EXISTS demo_orders (
      reference TEXT PRIMARY KEY,
      idempotency_key TEXT NOT NULL UNIQUE,
      request_hash TEXT NOT NULL,
      customer_json TEXT NOT NULL,
      total INTEGER NOT NULL,
      item_count INTEGER NOT NULL,
      result_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS demo_order_items (
      order_reference TEXT NOT NULL REFERENCES demo_orders(reference),
      product_id TEXT NOT NULL,
      title TEXT NOT NULL,
      unit_price INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      PRIMARY KEY (order_reference, product_id)
    );
  `)
  const insert = db.prepare('INSERT OR IGNORE INTO catalog (id, data_json, stock) VALUES (?, ?, ?)')
  // Keep the source taxonomy current without overwriting stored prices, orders or inventory.
  const syncTaxonomy = db.prepare("UPDATE catalog SET data_json = json_set(data_json, '$.categories', json(?), '$.subcategories', json(?)) WHERE id = ?")
  db.exec('BEGIN IMMEDIATE')
  try {
    for (const product of seedProducts) {
      insert.run(product.id, JSON.stringify(product), 20)
      syncTaxonomy.run(JSON.stringify(product.categories), JSON.stringify(product.subcategories), product.id)
    }
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }

  const getProduct = db.prepare('SELECT data_json, stock FROM catalog WHERE id = ?')
  const getOrder = db.prepare('SELECT request_hash, result_json FROM demo_orders WHERE idempotency_key = ?')
  const decrement = db.prepare('UPDATE catalog SET stock = stock - ? WHERE id = ? AND stock >= ?')
  const insertOrder = db.prepare('INSERT INTO demo_orders (reference, idempotency_key, request_hash, customer_json, total, item_count, result_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
  const insertItem = db.prepare('INSERT INTO demo_order_items (order_reference, product_id, title, unit_price, quantity) VALUES (?, ?, ?, ?, ?)')

  return {
    getCatalog() {
      return db.prepare('SELECT data_json, stock FROM catalog ORDER BY rowid').all().map((row) => ({ ...JSON.parse(row.data_json), stock: row.stock }))
    },
    placeDemoOrder(body, key) {
      const request = validateOrder(body, key)
      const requestHash = createHash('sha256').update(JSON.stringify(request)).digest('hex')
      db.exec('BEGIN IMMEDIATE')
      try {
        const existing = getOrder.get(key)
        if (existing) {
          if (existing.request_hash !== requestHash) throw new OrderError('KEY_REUSED', 'این درخواست قبلاً با اطلاعات دیگری ثبت شده است.', 409)
          db.exec('COMMIT')
          return { order: JSON.parse(existing.result_json), replayed: true }
        }
        let total = 0
        let itemCount = 0
        const orderItems = request.items.map((item) => {
          const row = getProduct.get(item.id)
          if (!row) throw new OrderError('UNKNOWN_PRODUCT', 'یکی از کالاها دیگر در فروشگاه موجود نیست.', 409)
          const product = JSON.parse(row.data_json)
          if (product.price !== item.expectedPrice) throw new OrderError('PRICE_CHANGED', 'قیمت یکی از کالاها تغییر کرده است؛ سبد را دوباره بررسی کنید.', 409)
          if (row.stock < item.quantity) throw new OrderError('OUT_OF_STOCK', `موجودی «${product.title}» کافی نیست؛ سبد را دوباره بررسی کنید.`, 409)
          total += product.price * item.quantity
          itemCount += item.quantity
          return { id: product.id, title: product.title, unitPrice: product.price, quantity: item.quantity }
        })
        const reference = `DK-${randomBytes(8).toString('hex').toUpperCase()}`
        const createdAt = new Date().toISOString()
        const order = { reference, createdAt, status: 'demo', total, itemCount, items: orderItems }
        insertOrder.run(reference, key, requestHash, JSON.stringify(request.customer), total, itemCount, JSON.stringify(order), createdAt)
        for (const item of orderItems) {
          if (decrement.run(item.quantity, item.id, item.quantity).changes !== 1) throw new OrderError('OUT_OF_STOCK', 'موجودی کالا تغییر کرده است؛ سبد را دوباره بررسی کنید.', 409)
          insertItem.run(reference, item.id, item.title, item.unitPrice, item.quantity)
        }
        db.exec('COMMIT')
        return { order, replayed: false }
      } catch (error) {
        db.exec('ROLLBACK')
        throw error
      }
    },
    listDemoOrders() {
      return db.prepare('SELECT reference, created_at AS createdAt, total, item_count AS itemCount FROM demo_orders ORDER BY created_at DESC LIMIT 100').all()
    },
    close() { db.close() },
  }
}
