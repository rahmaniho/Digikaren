import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

// Generate the worker after Vite names its hashed assets. All visual catalog
// assets are available offline; API requests are deliberately never cached.
export function pwaPlugin() {
  return {
    name: 'digikaren-offline-app',
    generateBundle(_options, bundle) {
      const imageNames = readdirSync('public/images').filter((file) => /\.(?:jpe?g|png|svg|webp)$/i.test(file)).sort()
      const publicFiles = [
        'manifest.webmanifest', 'favicon.png', 'digikaren-logo.png',
        'pwa/icon-192.png', 'pwa/icon-512.png',
        ...imageNames.map((name) => `images/${name}`),
      ]
      const compiledFiles = Object.keys(bundle).filter((file) => /\.(?:js|css|woff2)$/i.test(file)).sort()
      const files = ['index.html', ...compiledFiles, ...publicFiles]
      const template = readFileSync('src/service-worker.js', 'utf8')
      const hash = createHash('sha256').update(template).update(JSON.stringify(files))
      hash.update(readFileSync('index.html'))
      if (bundle['index.html']?.source) hash.update(bundle['index.html'].source)
      // Public assets are not content-hashed by Vite. Include their contents so
      // a change at the same URL still creates a fresh offline cache.
      for (const file of publicFiles) hash.update(file).update(readFileSync(resolve('public', file)))
      const source = template
        .replace('__CACHE_VERSION__', hash.digest('hex').slice(0, 16))
        .replace('__PRECACHE_URLS__', JSON.stringify(files))
      this.emitFile({ type: 'asset', fileName: 'sw.js', source })
    },
  }
}
