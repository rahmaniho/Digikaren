import { DatabaseSync } from 'node:sqlite'
import { createHash, randomBytes } from 'node:crypto'
import { chmodSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { products as seedProducts } from '../src/data.js'
import { MAX_ORDER_ITEMS, MAX_QUANTITY } from '../src/cart-limits.js'
import { MAX_ADMIN_ACTIVITY, MAX_ADMIN_ORDERS, MAX_ADMIN_PRODUCTS, ORDER_REVIEW_STATES, validateAdminProduct } from '../src/admin/shared.js'

export { MAX_QUANTITY }

export class OrderError extends Error {
  constructor(code, message, status = 400) {
    super(message)
    this.code = code
    this.status = status
  }
}

export class AdminError extends OrderError {}

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
      stock INTEGER NOT NULL CHECK (stock >= 0),
      active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
      version INTEGER NOT NULL DEFAULT 1,
      taxonomy_overridden INTEGER NOT NULL DEFAULT 0 CHECK (taxonomy_overridden IN (0, 1))
    );
    CREATE TABLE IF NOT EXISTS demo_orders (
      reference TEXT PRIMARY KEY,
      idempotency_key TEXT NOT NULL UNIQUE,
      request_hash TEXT NOT NULL,
      customer_json TEXT NOT NULL,
      total INTEGER NOT NULL,
      item_count INTEGER NOT NULL,
      result_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      review_status TEXT NOT NULL DEFAULT 'new',
      review_version INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS demo_order_items (
      order_reference TEXT NOT NULL REFERENCES demo_orders(reference),
      product_id TEXT NOT NULL,
      title TEXT NOT NULL,
      unit_price INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      PRIMARY KEY (order_reference, product_id)
    );
    CREATE TABLE IF NOT EXISTS admin_activity (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      label TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `)
  // Migrate previous demo databases without discarding inventory or orders.
  const catalogColumns = new Set(db.prepare('PRAGMA table_info(catalog)').all().map((column) => column.name))
  if (!catalogColumns.has('active')) db.exec('ALTER TABLE catalog ADD COLUMN active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1))')
  if (!catalogColumns.has('version')) db.exec('ALTER TABLE catalog ADD COLUMN version INTEGER NOT NULL DEFAULT 1')
  if (!catalogColumns.has('taxonomy_overridden')) db.exec('ALTER TABLE catalog ADD COLUMN taxonomy_overridden INTEGER NOT NULL DEFAULT 0 CHECK (taxonomy_overridden IN (0, 1))')
  const orderColumns = new Set(db.prepare('PRAGMA table_info(demo_orders)').all().map((column) => column.name))
  if (!orderColumns.has('review_status')) db.exec("ALTER TABLE demo_orders ADD COLUMN review_status TEXT NOT NULL DEFAULT 'new'")
  if (!orderColumns.has('review_version')) db.exec('ALTER TABLE demo_orders ADD COLUMN review_version INTEGER NOT NULL DEFAULT 1')

  const insert = db.prepare('INSERT OR IGNORE INTO catalog (id, data_json, stock) VALUES (?, ?, ?)')
  // Keep the source taxonomy current without overwriting stored prices, orders or inventory.
  const syncTaxonomy = db.prepare(`UPDATE catalog SET data_json = json_set(data_json, '$.categories', json(?), '$.subcategories', json(?)), version = version + 1
    WHERE id = ? AND taxonomy_overridden = 0 AND (json_extract(data_json, '$.categories') IS NOT json(?) OR json_extract(data_json, '$.subcategories') IS NOT json(?))`)
  db.exec('BEGIN IMMEDIATE')
  try {
    for (const product of seedProducts) {
      insert.run(product.id, JSON.stringify(product), 20)
      const productCategories = JSON.stringify(product.categories)
      const productSubcategories = JSON.stringify(product.subcategories)
      syncTaxonomy.run(productCategories, productSubcategories, product.id, productCategories, productSubcategories)
    }
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }

  const getProduct = db.prepare('SELECT data_json, stock, active, version, taxonomy_overridden FROM catalog WHERE id = ?')
  const getOrder = db.prepare('SELECT request_hash, result_json FROM demo_orders WHERE idempotency_key = ?')
  const decrement = db.prepare('UPDATE catalog SET stock = stock - ?, version = version + 1 WHERE id = ? AND stock >= ? AND active = 1')
  const insertOrder = db.prepare('INSERT INTO demo_orders (reference, idempotency_key, request_hash, customer_json, total, item_count, result_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
  const insertItem = db.prepare('INSERT INTO demo_order_items (order_reference, product_id, title, unit_price, quantity) VALUES (?, ?, ?, ?, ?)')
  const addActivity = db.prepare('INSERT INTO admin_activity (action, entity_id, label, created_at) VALUES (?, ?, ?, ?)')
  const adminProduct = (row) => ({ ...JSON.parse(row.data_json), stock: row.stock, active: Boolean(row.active), version: row.version })
  const listAdminProducts = () => db.prepare('SELECT data_json, stock, active, version FROM catalog ORDER BY rowid DESC LIMIT ?').all(MAX_ADMIN_PRODUCTS).map(adminProduct)
  const activity = (action, id, label) => addActivity.run(action, id, label, new Date().toISOString())
  const transaction = (action) => {
    db.exec('BEGIN IMMEDIATE')
    try { const result = action(); db.exec('COMMIT'); return result } catch (error) { db.exec('ROLLBACK'); throw error }
  }
  const validateAdminInput = (input) => {
    const result = validateAdminProduct(input)
    if (result.error) throw new AdminError('INVALID_PRODUCT', result.error, 400)
    return result.value
  }

  return {
    getCatalog() {
      return db.prepare('SELECT data_json, stock FROM catalog WHERE active = 1 ORDER BY rowid').all().map((row) => ({ ...JSON.parse(row.data_json), stock: row.stock }))
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
          if (!row || !row.active) throw new OrderError('UNKNOWN_PRODUCT', 'یکی از کالاها دیگر در فروشگاه موجود نیست.', 409)
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
    getAdminSnapshot() {
      const products = listAdminProducts()
      const orders = db.prepare(`SELECT reference, created_at AS createdAt, total, item_count AS itemCount, review_status AS reviewStatus, review_version AS version
        FROM demo_orders ORDER BY created_at DESC, rowid DESC LIMIT ?`).all(MAX_ADMIN_ORDERS)
      const totals = db.prepare(`SELECT COUNT(*) AS orderCount, COALESCE(SUM(total), 0) AS orderValue,
        COALESCE(SUM(CASE WHEN review_status IN ('new', 'reviewing') THEN 1 ELSE 0 END), 0) AS pendingCount FROM demo_orders`).get()
      const topProducts = db.prepare(`SELECT product_id AS id, title, SUM(quantity) AS quantity, SUM(unit_price * quantity) AS value
        FROM demo_order_items GROUP BY product_id ORDER BY quantity DESC, product_id LIMIT 5`).all()
      const activities = db.prepare(`SELECT id, action, entity_id AS entityId, label, created_at AS createdAt
        FROM admin_activity ORDER BY id DESC LIMIT ?`).all(MAX_ADMIN_ACTIVITY)
      return { products, orders, totals, topProducts, activities, orderLimit: MAX_ADMIN_ORDERS }
    },
    getAdminOrder(reference) {
      if (typeof reference !== 'string' || !/^DK-[0-9A-F]{16}$/.test(reference)) throw new AdminError('NOT_FOUND', 'سفارش پیدا نشد.', 404)
      const row = db.prepare('SELECT customer_json, result_json, review_status, review_version FROM demo_orders WHERE reference = ?').get(reference)
      if (!row) throw new AdminError('NOT_FOUND', 'سفارش پیدا نشد.', 404)
      return { ...JSON.parse(row.result_json), customer: JSON.parse(row.customer_json), reviewStatus: row.review_status, version: row.review_version }
    },
    getAdminCustomers() {
      // These are recipients in demo orders, not registered user accounts.
      return db.prepare(`SELECT json_extract(o.customer_json, '$.phone') AS phone,
        (SELECT json_extract(latest.customer_json, '$.name') FROM demo_orders latest
         WHERE json_extract(latest.customer_json, '$.phone') = json_extract(o.customer_json, '$.phone') ORDER BY latest.created_at DESC, latest.rowid DESC LIMIT 1) AS name,
        (SELECT json_extract(latest.customer_json, '$.city') FROM demo_orders latest
         WHERE json_extract(latest.customer_json, '$.phone') = json_extract(o.customer_json, '$.phone') ORDER BY latest.created_at DESC, latest.rowid DESC LIMIT 1) AS city,
        COUNT(*) AS orderCount, SUM(o.total) AS orderValue, MAX(o.created_at) AS lastOrder
        FROM demo_orders o GROUP BY json_extract(o.customer_json, '$.phone') ORDER BY lastOrder DESC LIMIT 500`).all()
    },
    createAdminProduct(input) {
      const product = validateAdminInput(input)
      return transaction(() => {
        if (db.prepare('SELECT COUNT(*) AS count FROM catalog').get().count >= MAX_ADMIN_PRODUCTS) throw new AdminError('LIMIT', 'حداکثر تعداد کالاهای نسخهٔ آزمایشی تکمیل شده است.', 409)
        if (getProduct.get(product.id)) throw new AdminError('DUPLICATE', 'این شناسهٔ کالا قبلاً ثبت شده است.', 409)
        const { stock, active, ...data } = product
        const saved = { ...data, rating: '۰', reviews: 0, sold: 0, badge: 'کالای نمونه' }
        db.prepare('INSERT INTO catalog (id, data_json, stock, active, version, taxonomy_overridden) VALUES (?, ?, ?, ?, 1, 1)').run(product.id, JSON.stringify(saved), stock, active ? 1 : 0)
        activity('product_created', product.id, product.title)
        return adminProduct(getProduct.get(product.id))
      })
    },
    updateAdminProduct(id, input) {
      const product = validateAdminInput(input)
      if (id !== product.id || !Number.isSafeInteger(input.version) || input.version < 1) throw new AdminError('INVALID_PRODUCT', 'شناسه یا نسخهٔ کالا معتبر نیست.', 400)
      return transaction(() => {
        const row = getProduct.get(id)
        if (!row) throw new AdminError('NOT_FOUND', 'کالا پیدا نشد.', 404)
        if (row.version !== input.version) throw new AdminError('STALE_PRODUCT', 'این کالا تغییر کرده است؛ صفحه را به‌روز و دوباره تلاش کنید.', 409)
        const original = JSON.parse(row.data_json)
        const changedTaxonomy = JSON.stringify(original.categories) !== JSON.stringify(product.categories) || JSON.stringify(original.subcategories) !== JSON.stringify(product.subcategories)
        const { stock, active, ...data } = product
        const saved = { ...original, ...data }
        const result = db.prepare('UPDATE catalog SET data_json = ?, stock = ?, active = ?, version = version + 1, taxonomy_overridden = ? WHERE id = ? AND version = ?')
          .run(JSON.stringify(saved), stock, active ? 1 : 0, row.taxonomy_overridden || changedTaxonomy ? 1 : 0, id, input.version)
        if (result.changes !== 1) throw new AdminError('STALE_PRODUCT', 'این کالا تغییر کرده است؛ صفحه را به‌روز و دوباره تلاش کنید.', 409)
        activity(row.active !== Number(active) ? 'product_visibility' : 'product_updated', id, product.title)
        return adminProduct(getProduct.get(id))
      })
    },
    updateAdminOrder(reference, reviewStatus, version) {
      if (!ORDER_REVIEW_STATES.includes(reviewStatus) || !Number.isSafeInteger(version) || version < 1) throw new AdminError('INVALID_STATUS', 'وضعیت بررسی معتبر نیست.', 400)
      return transaction(() => {
        const order = this.getAdminOrder(reference)
        if (order.version !== version) throw new AdminError('STALE_ORDER', 'این سفارش تغییر کرده است؛ صفحه را به‌روز کنید.', 409)
        const result = db.prepare('UPDATE demo_orders SET review_status = ?, review_version = review_version + 1 WHERE reference = ? AND review_version = ?').run(reviewStatus, reference, version)
        if (result.changes !== 1) throw new AdminError('STALE_ORDER', 'این سفارش تغییر کرده است؛ صفحه را به‌روز کنید.', 409)
        activity('order_review', reference, reviewStatus)
        return { reviewStatus, version: version + 1 }
      })
    },
    close() { db.close() },
  }
}
