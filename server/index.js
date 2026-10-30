import { createServer as createHttpServer } from 'node:http'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import { createStore } from './database.js'
import { createApiApp } from './api.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const development = process.argv.includes('--dev')
const port = Number(process.env.PORT || (development ? 5173 : 3000))
const databasePath = process.env.DIGIKAREN_DB || path.join(root, 'var', 'digikaren.sqlite')
const store = createStore(databasePath)
const app = createApiApp(store)
const httpServer = createHttpServer(app)
let vite

if (development) {
  const { createServer } = await import('vite')
  vite = await createServer({ root, server: { middlewareMode: true, hmr: { server: httpServer }, allowedHosts: true }, appType: 'spa' })
  app.use(vite.middlewares)
} else {
  const dist = path.join(root, 'dist')
  if (!existsSync(path.join(dist, 'index.html'))) {
    console.error('Production build not found. Run npm run build first.')
    store.close()
    process.exit(1)
  }
  app.use(express.static(dist, { index: false, maxAge: '1h' }))
  app.use((request, response, next) => {
    if (request.method !== 'GET' || !request.accepts('html')) return next()
    return response.sendFile(path.join(dist, 'index.html'))
  })
}

httpServer.listen(port, '0.0.0.0', () => console.log(`دیجی‌کارن: http://0.0.0.0:${port} (${development ? 'development' : 'production'}, demo checkout)`))
let closing = false
async function shutdown() {
  if (closing) return
  closing = true
  if (vite) await vite.close()
  httpServer.close(() => { store.close(); process.exit(0) })
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
