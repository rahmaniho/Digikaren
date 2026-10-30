import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { assetUrl } from '../src/assets.js'

const publicFile = (path) => new URL(`../public/${path}`, import.meta.url)

test('asset paths work at the root and on a GitHub Pages project subpath', () => {
  assert.equal(assetUrl('/images/product-phone.jpg'), '/images/product-phone.jpg')
  assert.equal(assetUrl('/images/product-phone.jpg', '/Digikaren/'), '/Digikaren/images/product-phone.jpg')
  assert.equal(assetUrl('/favicon.png', '/Digikaren/'), '/Digikaren/favicon.png')
  assert.equal(assetUrl('https://example.test/image.jpg', '/Digikaren/'), 'https://example.test/image.jpg')
  assert.equal(assetUrl('//example.test/image.jpg', '/Digikaren/'), '//example.test/image.jpg')
})

test('manifest scope, start URL and branded icon sizes support root and subpath installs', () => {
  const manifest = JSON.parse(readFileSync(publicFile('manifest.webmanifest'), 'utf8'))
  assert.equal(manifest.display, 'standalone')
  assert.equal(manifest.lang, 'fa')
  for (const base of ['https://example.test/', 'https://example.test/Digikaren/']) {
    const manifestUrl = new URL('manifest.webmanifest', base)
    assert.equal(new URL(manifest.start_url, manifestUrl).href, base)
    assert.equal(new URL(manifest.scope, manifestUrl).href, base)
  }
  for (const size of [192, 512]) {
    const icon = manifest.icons.find((item) => item.sizes === `${size}x${size}`)
    assert.ok(icon)
    const png = readFileSync(publicFile(icon.src.replace(/^\.\//, '')))
    assert.equal(png.readUInt32BE(16), size)
    assert.equal(png.readUInt32BE(20), size)
  }
})

test('worker caches only public assets, excludes APIs and serves query routes offline', async () => {
  const listeners = {}
  const stored = new Map()
  let skippedWaiting = false
  let claimed = false
  let networkCalls = 0
  const cache = {
    async addAll(urls) { for (const url of urls) stored.set(url, { url, fromCache: true }) },
    async match(request) { return stored.get(typeof request === 'string' ? request : request.url) },
    async put(request, response) { stored.set(request.url, response) },
  }
  const deleted = []
  const caches = {
    async open() { return cache },
    async keys() { return ['digikaren-shell-%2FDigikaren%2F-old', 'digikaren-shell-%2FDigikaren%2F-test', 'digikaren-shell-%2F-test', 'other-app'] },
    async delete(name) { deleted.push(name) },
  }
  const self = {
    registration: { scope: 'https://example.test/Digikaren/' },
    location: { origin: 'https://example.test' },
    addEventListener(type, callback) { listeners[type] = callback },
    async skipWaiting() { skippedWaiting = true },
    clients: { async claim() { claimed = true } },
  }
  const source = readFileSync(new URL('../src/service-worker.js', import.meta.url), 'utf8')
    .replace('__CACHE_VERSION__', 'test')
    .replace('__PRECACHE_URLS__', JSON.stringify(['index.html', 'assets/app.js', 'images/one.jpg']))
  runInNewContext(source, { self, caches, URL, fetch: async () => { networkCalls++; throw new TypeError('offline') } })

  let task
  listeners.install({ waitUntil(promise) { task = promise } })
  await task
  assert.equal(skippedWaiting, true)
  assert.ok(stored.has('https://example.test/Digikaren/index.html'))
  assert.ok(stored.has('https://example.test/Digikaren/assets/app.js'))
  listeners.activate({ waitUntil(promise) { task = promise } })
  await task
  assert.equal(claimed, true)
  assert.deepEqual(deleted, ['digikaren-shell-%2FDigikaren%2F-old'])

  const fire = (request) => {
    let response
    listeners.fetch({ request, respondWith(promise) { response = promise } })
    return response
  }
  assert.equal(fire({ method: 'POST', url: 'https://example.test/Digikaren/api/demo-orders' }), undefined)
  assert.equal(fire({ method: 'GET', url: 'https://example.test/Digikaren/api/catalog', destination: '' }), undefined)
  assert.equal(fire({ method: 'GET', url: 'https://example.test/api/catalog', destination: '' }), undefined)
  assert.equal(fire({ method: 'GET', url: 'https://example.test/Digikaren/images/one.jpg?private=1', destination: 'image' }), undefined)
  assert.equal(networkCalls, 0)

  const navigation = await fire({ method: 'GET', url: 'https://example.test/Digikaren/?product=desk-lamp', mode: 'navigate' })
  assert.equal(navigation.url, 'https://example.test/Digikaren/index.html')
  const image = await fire({ method: 'GET', url: 'https://example.test/Digikaren/images/one.jpg', mode: 'no-cors', destination: 'image' })
  assert.equal(image.fromCache, true)
  assert.equal(networkCalls, 1)
})
