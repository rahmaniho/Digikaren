import express from 'express'
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { AdminError } from './database.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const publicImages = path.join(root, 'public', 'images')
const COOKIE = 'digikaren_admin'
const SESSION_MS = 8 * 60 * 60 * 1000
const LOGIN_WINDOW_MS = 15 * 60 * 1000
const MAX_UPLOAD_BYTES = 2 * 1024 * 1024

function digest(value) { return createHash('sha256').update(String(value)).digest() }
function safeEqual(a, b) { return timingSafeEqual(digest(a), digest(b)) }
function cookieValue(header = '') {
  const match = header.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE}=`))
  const value = match?.slice(COOKIE.length + 1) || ''
  return /^[a-f0-9]{64}$/.test(value) ? value : ''
}
function secureRequest(request) {
  return request.secure || request.get('x-forwarded-proto')?.split(',')[0].trim() === 'https'
}
function setSessionCookie(response, request, id, maxAge) {
  const secure = secureRequest(request) ? '; Secure' : ''
  response.setHeader('Set-Cookie', `${COOKIE}=${id}; Path=/api/admin; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}`)
}
function requestIsSameOrigin(request) {
  if (request.get('sec-fetch-site') === 'cross-site') return false
  const origin = request.get('origin')
  if (!origin) return true // Non-browser API clients still need the password and CSRF token.
  try {
    const url = new URL(origin)
    const host = (request.get('x-forwarded-host') || request.get('host') || '').split(',')[0].trim()
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password && url.host === host
  } catch { return false }
}
function imageExists(image, uploadsDir) {
  if (typeof image !== 'string') return false
  const match = /^\/(images|uploads)\/([a-zA-Z0-9][a-zA-Z0-9._-]{0,125})$/.exec(image)
  if (!match) return false
  const dir = match[1] === 'images' ? publicImages : uploadsDir
  try { return statSync(path.join(dir, match[2])).isFile() } catch { return false }
}
function decodeImage(data) {
  if (typeof data !== 'string' || data.length > Math.ceil(MAX_UPLOAD_BYTES * 4 / 3) + 100) throw new AdminError('INVALID_IMAGE', 'حجم تصویر نباید بیشتر از ۲ مگابایت باشد.', 400)
  const match = /^data:image\/(png|jpeg|webp);base64,([a-zA-Z0-9+/]+={0,2})$/.exec(data)
  if (!match) throw new AdminError('INVALID_IMAGE', 'فقط تصویر PNG، JPEG یا WebP مجاز است.', 400)
  const bytes = Buffer.from(match[2], 'base64')
  if (!bytes.length || bytes.length > MAX_UPLOAD_BYTES) throw new AdminError('INVALID_IMAGE', 'حجم تصویر نباید بیشتر از ۲ مگابایت باشد.', 400)
  const png = bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  const jpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  const webp = bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP'
  if (!(match[1] === 'png' && png) && !(match[1] === 'jpeg' && jpeg) && !(match[1] === 'webp' && webp)) throw new AdminError('INVALID_IMAGE', 'محتوای فایل با نوع تصویر همخوانی ندارد.', 400)
  return { bytes, extension: match[1] === 'jpeg' ? 'jpg' : match[1] }
}

export function createAdminRouter(store, { password = '', uploadsDir = path.join(root, 'var', 'uploads') } = {}) {
  const router = express.Router()
  const enabled = typeof password === 'string' && password.length >= 16 && password.length <= 1024
  const sessions = new Map()
  const attempts = new Map()
  const sessionFor = (request) => {
    const id = cookieValue(request.get('cookie'))
    const session = sessions.get(id)
    if (!session) return null
    if (session.expiresAt <= Date.now()) { sessions.delete(id); return null }
    return { ...session, id }
  }

  // JSON + a custom header prevents simple cross-origin form requests. Authenticated
  // mutations also require the per-session CSRF token below.
  router.use((request, response, next) => {
    if (['GET', 'HEAD'].includes(request.method)) return next()
    if (!requestIsSameOrigin(request) || request.get('x-requested-with') !== 'DigikarenAdmin') return response.status(403).json({ error: { code: 'ORIGIN', message: 'درخواست از مبدأ مجاز ارسال نشده است.' } })
    if (request.method !== 'DELETE' && !request.is('application/json')) return response.status(415).json({ error: { code: 'CONTENT_TYPE', message: 'درخواست باید از نوع JSON باشد.' } })
    return next()
  })

  router.get('/session', (request, response) => {
    const session = enabled ? sessionFor(request) : null
    response.json({ enabled, authenticated: Boolean(session), ...(session ? { csrf: session.csrf } : {}) })
  })
  router.post('/session', (request, response) => {
    if (!enabled) return response.status(503).json({ error: { code: 'ADMIN_DISABLED', message: 'رمز پنل در تنظیمات سرور تعریف نشده است.' } })
    const now = Date.now()
    for (const [ip, record] of attempts) if (record.expiresAt <= now) attempts.delete(ip)
    const ip = request.socket.remoteAddress || 'unknown'
    const limit = attempts.get(ip) || { count: 0, expiresAt: now + LOGIN_WINDOW_MS }
    if (limit.count >= 8) return response.status(429).json({ error: { code: 'RATE_LIMIT', message: 'تعداد تلاش‌ها زیاد است؛ کمی بعد دوباره تلاش کنید.' } })
    const supplied = request.body?.password
    if (typeof supplied !== 'string' || supplied.length > 1024 || !safeEqual(supplied, password)) {
      if (attempts.size >= 1000 && !attempts.has(ip)) attempts.delete(attempts.keys().next().value)
      limit.count++
      attempts.set(ip, limit)
      return response.status(401).json({ error: { code: 'LOGIN_FAILED', message: 'رمز مدیریت درست نیست.' } })
    }
    attempts.delete(ip)
    const existing = sessionFor(request)
    if (existing) sessions.delete(existing.id)
    for (const [id, session] of sessions) if (session.expiresAt <= now) sessions.delete(id)
    if (sessions.size >= 100) sessions.delete(sessions.keys().next().value)
    const id = randomBytes(32).toString('hex')
    const csrf = randomBytes(32).toString('hex')
    sessions.set(id, { csrf, expiresAt: now + SESSION_MS })
    setSessionCookie(response, request, id, Math.floor(SESSION_MS / 1000))
    return response.json({ authenticated: true, csrf })
  })
  router.use((request, response, next) => {
    if (!enabled) return response.status(503).json({ error: { code: 'ADMIN_DISABLED', message: 'پنل مدیریت روی این سرور فعال نشده است.' } })
    const session = sessionFor(request)
    if (!session) return response.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'برای ورود به پنل احراز هویت لازم است.' } })
    if (!['GET', 'HEAD'].includes(request.method)) {
      const token = request.get('x-admin-csrf') || ''
      if (!/^[a-f0-9]{64}$/.test(token) || !safeEqual(token, session.csrf)) return response.status(403).json({ error: { code: 'CSRF', message: 'نشست مدیریت معتبر نیست؛ دوباره وارد شوید.' } })
    }
    request.adminSession = session
    return next()
  })
  router.delete('/session', (request, response) => {
    sessions.delete(request.adminSession.id)
    setSessionCookie(response, request, '', 0)
    response.json({ ok: true })
  })
  router.get('/snapshot', (request, response) => response.json(store.getAdminSnapshot()))
  router.get('/customers', (request, response) => response.json({ customers: store.getAdminCustomers() }))
  router.get('/orders/:reference', (request, response, next) => {
    try { response.json({ order: store.getAdminOrder(request.params.reference) }) } catch (error) { next(error) }
  })
  router.patch('/orders/:reference', (request, response, next) => {
    try { response.json(store.updateAdminOrder(request.params.reference, request.body?.reviewStatus, request.body?.version)) } catch (error) { next(error) }
  })
  router.post('/products', (request, response, next) => {
    try {
      if (!imageExists(request.body?.image, uploadsDir)) throw new AdminError('INVALID_IMAGE', 'تصویر انتخاب‌شده در سرور پیدا نشد.', 400)
      response.status(201).json({ product: store.createAdminProduct(request.body) })
    } catch (error) { next(error) }
  })
  router.put('/products/:id', (request, response, next) => {
    try {
      if (!imageExists(request.body?.image, uploadsDir)) throw new AdminError('INVALID_IMAGE', 'تصویر انتخاب‌شده در سرور پیدا نشد.', 400)
      response.json({ product: store.updateAdminProduct(request.params.id, request.body) })
    } catch (error) { next(error) }
  })
  router.post('/uploads', (request, response, next) => {
    try {
      const { bytes, extension } = decodeImage(request.body?.data)
      const filename = `${createHash('sha256').update(bytes).digest('hex')}.${extension}`
      mkdirSync(uploadsDir, { recursive: true, mode: 0o700 })
      const file = path.join(uploadsDir, filename)
      if (!existsSync(file)) writeFileSync(file, bytes, { flag: 'wx', mode: 0o600 })
      response.status(201).json({ image: `/uploads/${filename}` })
    } catch (error) { next(error) }
  })
  return router
}
