// The build replaces these placeholders with a content-based cache version and static files.
const FILES = __PRECACHE_URLS__
const scopeUrl = self.registration.scope
const scopePath = new URL(scopeUrl).pathname
// Different deployments on the same origin must not delete each other's caches.
const CACHE_PREFIX = `digikaren-shell-${encodeURIComponent(scopePath)}-`
const CACHE_NAME = `${CACHE_PREFIX}__CACHE_VERSION__`
const apiPath = new URL('api/', scopeUrl).pathname
const indexUrl = new URL('index.html', scopeUrl).href

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(FILES.map((path) => new URL(path, scopeUrl).href)))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME).map((name) => caches.delete(name))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin || !url.pathname.startsWith(scopePath) || url.pathname.startsWith(apiPath)) return

  if (request.mode === 'navigate') {
    // Product routes use query parameters; fall back to the same cached app shell.
    event.respondWith(fetch(request).catch(async () => (await caches.open(CACHE_NAME)).match(indexUrl)))
    return
  }

  // Only public static assets are cached; forms, API calls and query-bearing requests are not.
  if (url.search || !['script', 'style', 'image', 'font', 'manifest'].includes(request.destination)) return
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME)
    const cached = await cache.match(request)
    if (cached) return cached
    const response = await fetch(request)
    if (response.ok && response.type === 'basic') await cache.put(request, response.clone())
    return response
  })())
})
