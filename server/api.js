import express from 'express'
import { OrderError } from './database.js'
import { categories } from '../src/data.js'

export function createApiApp(store) {
  const app = express()
  app.disable('x-powered-by')
  app.use((request, response, next) => {
    response.setHeader('X-Content-Type-Options', 'nosniff')
    response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
    next()
  })
  app.use('/api', (request, response, next) => {
    response.setHeader('Cache-Control', 'no-store')
    next()
  }, express.json({ limit: '16kb' }))
  app.get('/api/health', (request, response) => response.json({ ok: true, mode: 'demo' }))
  app.get('/api/catalog', (request, response) => response.json({ products: store.getCatalog(), mode: 'demo' }))
  app.get('/api/categories', (request, response) => {
    const products = store.getCatalog()
    const groups = categories.map((category) => ({
      ...category,
      count: products.filter((product) => product.categories.includes(category.id)).length,
      sub: category.sub.map((item) => ({ ...item, count: products.filter((product) => product.subcategories?.[category.id]?.includes(item.id)).length })),
    }))
    response.json({ categories: groups, mode: 'demo' })
  })

  // Basic development throttling only; production needs a shared rate limiter and authentication.
  const attempts = new Map()
  app.post('/api/demo-orders', (request, response, next) => {
    if (!request.is('application/json')) return response.status(415).json({ error: { code: 'CONTENT_TYPE', message: 'درخواست باید از نوع JSON باشد.' } })
    const now = Date.now()
    const ip = request.socket.remoteAddress || 'unknown'
    for (const [address, limit] of attempts) if (limit.expires <= now) attempts.delete(address)
    const limit = attempts.get(ip) || { count: 0, expires: now + 10 * 60 * 1000 }
    limit.count++
    attempts.set(ip, limit)
    if (limit.count > 60) return response.status(429).json({ error: { code: 'RATE_LIMIT', message: 'تعداد درخواست‌ها زیاد است؛ کمی بعد دوباره تلاش کنید.' } })
    try {
      const result = store.placeDemoOrder(request.body, request.get('Idempotency-Key'))
      response.status(result.replayed ? 200 : 201).json(result)
    } catch (error) { next(error) }
  })
  app.use('/api', (request, response) => response.status(404).json({ error: { code: 'NOT_FOUND', message: 'مسیر مورد نظر پیدا نشد.' } }))
  app.use('/api', (error, request, response, next) => {
    if (error instanceof OrderError) return response.status(error.status).json({ error: { code: error.code, message: error.message } })
    if (error.status === 400 || error.status === 413) return response.status(error.status).json({ error: { code: 'INVALID_BODY', message: 'اطلاعات درخواست معتبر نیست.' } })
    console.error('Demo order API error:', error.message)
    return response.status(500).json({ error: { code: 'SERVER_ERROR', message: 'خطایی در سرور رخ داد؛ دوباره تلاش کنید.' } })
  })
  return app
}
