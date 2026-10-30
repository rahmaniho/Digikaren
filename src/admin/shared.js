import { categories } from '../data.js'
import { parsePrice } from '../discovery.js'

export const ADMIN_SECTIONS = ['overview', 'products', 'inventory', 'orders', 'customers', 'reports', 'categories', 'activity', 'settings']
export const ORDER_REVIEW_STATES = ['new', 'reviewing', 'reviewed', 'archived']
export const ORDER_REVIEW_LABELS = { new: 'جدید', reviewing: 'در حال بررسی', reviewed: 'بررسی‌شده', archived: 'بایگانی‌شده' }
export const LOW_STOCK_DEFAULT = 5
export const MAX_ADMIN_PRODUCTS = 1000
export const MAX_ADMIN_ORDERS = 500
export const MAX_ADMIN_ACTIVITY = 100

export function validAdminSection(section) {
  return ADMIN_SECTIONS.includes(section) ? section : 'overview'
}

function cleanText(value, min, max) {
  if (typeof value !== 'string' || /[\u0000-\u001f\u007f]/.test(value)) return null
  const result = value.trim().replace(/\s+/g, ' ')
  return result.length >= min && result.length <= max ? result : null
}

// This validation is shared by the admin UI, the local sandbox and the API.
// The server still verifies that the image actually exists before saving it.
export function validateAdminProduct(input, { allowDataImage = false } = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { error: 'اطلاعات کالا معتبر نیست.' }
  const id = typeof input.id === 'string' ? input.id.trim() : ''
  if (!/^[a-z0-9](?:[a-z0-9-]{0,48}[a-z0-9])?$/.test(id)) return { error: 'شناسه باید انگلیسی، یکتا و شامل حروف کوچک، عدد یا خط تیره باشد (حداکثر ۵۰ نویسه).' }
  const title = cleanText(input.title, 3, 160)
  if (!title) return { error: 'نام کالا باید بین ۳ تا ۱۶۰ نویسه باشد.' }
  const price = parsePrice(input.price)
  const oldPrice = parsePrice(input.oldPrice)
  const stock = parsePrice(input.stock)
  if (!Number.isSafeInteger(price) || price < 1 || price > 1_000_000_000_000) return { error: 'قیمت باید عددی صحیح و بیشتر از صفر باشد.' }
  if (!Number.isSafeInteger(oldPrice) || oldPrice < price || oldPrice > 1_000_000_000_000) return { error: 'قیمت قبل از تخفیف نباید کمتر از قیمت فعلی باشد.' }
  if (!Number.isSafeInteger(stock) || stock < 0 || stock > 999_999) return { error: 'موجودی باید عددی صحیح بین صفر تا ۹۹۹٬۹۹۹ باشد.' }
  if (typeof input.active !== 'boolean') return { error: 'وضعیت نمایش کالا معتبر نیست.' }
  const image = typeof input.image === 'string' ? input.image : ''
  const bundled = /^\/images\/[a-zA-Z0-9][a-zA-Z0-9._-]{0,120}\.(?:png|jpe?g|webp|svg)$/i.test(image)
  const uploaded = /^\/uploads\/[a-f0-9]{64}\.(?:png|jpg|webp)$/.test(image)
  const sandboxImage = allowDataImage && image.length <= 300_000 && /^data:image\/(?:png|jpeg|webp);base64,[a-zA-Z0-9+/]+={0,2}$/.test(image)
  if (!bundled && !(uploaded && !allowDataImage) && !sandboxImage) return { error: 'تصویر باید از تصاویر فروشگاه یا فایل بارگذاری‌شده باشد.' }
  if (!Array.isArray(input.categories) || input.categories.length < 1 || input.categories.length > 5 || new Set(input.categories).size !== input.categories.length) return { error: 'حداقل یک دستهٔ معتبر انتخاب کنید.' }
  if (!input.subcategories || typeof input.subcategories !== 'object' || Array.isArray(input.subcategories)) return { error: 'زیردستهٔ کالا را انتخاب کنید.' }
  if (Object.keys(input.subcategories).some((id) => !input.categories.includes(id))) return { error: 'دسته‌بندی کالا معتبر نیست.' }
  const assigned = {}
  for (const id of input.categories) {
    const category = categories.find((item) => item.id === id)
    const sub = input.subcategories[id]
    if (!category || !Array.isArray(sub) || sub.length < 1 || sub.length > 20 || new Set(sub).size !== sub.length || sub.some((item) => !category.sub.some((choice) => choice.id === item))) return { error: 'دسته یا زیردستهٔ انتخاب‌شده معتبر نیست.' }
    assigned[id] = [...sub]
  }
  if (!Array.isArray(input.features) || input.features.length < 1 || input.features.length > 8) return { error: 'بین یک تا هشت ویژگی برای کالا وارد کنید.' }
  const features = input.features.map((feature) => cleanText(feature, 1, 120))
  if (features.some((feature) => !feature)) return { error: 'هر ویژگی باید حداکثر ۱۲۰ نویسه و بدون نویسهٔ کنترلی باشد.' }
  const discount = oldPrice > price ? Math.max(1, Math.round((1 - price / oldPrice) * 100)) : 0
  return { value: { id, title, image, categories: [...input.categories], subcategories: assigned, price, oldPrice, stock, active: input.active, features, discount } }
}

export function csvCell(value) {
  let text = String(value ?? '').replace(/\r\n?/g, '\n')
  // Prevent spreadsheet programs from treating user-provided text as a formula.
  if (/^[\t\n\s]*[=+\-@]/.test(text)) text = `'${text}`
  return `"${text.replace(/"/g, '""')}"`
}

export function csvText(rows) {
  return '\uFEFF' + rows.map((row) => row.map(csvCell).join(',')).join('\r\n')
}
