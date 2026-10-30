// The build replaces these placeholders with a content-based cache version and static files.
const FILES = ["index.html","assets/index-9UOf2BEu.js","assets/index-M1kOhKN2.css","assets/vazirmatn-arabic-400-normal-DMZFCm7K.woff2","assets/vazirmatn-arabic-500-normal-C_lbnnKa.woff2","assets/vazirmatn-arabic-600-normal-CPKvAnd1.woff2","assets/vazirmatn-arabic-700-normal-Dge_DOjm.woff2","assets/vazirmatn-arabic-800-normal-Bwnt96zj.woff2","assets/vazirmatn-arabic-900-normal-BVDx3pOU.woff2","assets/vazirmatn-latin-400-normal-BT_DHTc7.woff2","assets/vazirmatn-latin-500-normal-6zZzgpg4.woff2","assets/vazirmatn-latin-600-normal-D-zF-Oec.woff2","assets/vazirmatn-latin-700-normal-9BlbvDRV.woff2","assets/vazirmatn-latin-800-normal-e0EQwLmk.woff2","assets/vazirmatn-latin-900-normal-DUUbkNfs.woff2","assets/vazirmatn-latin-ext-400-normal-BdGhO0lm.woff2","assets/vazirmatn-latin-ext-500-normal-CgxvvVrG.woff2","assets/vazirmatn-latin-ext-600-normal-CyxCUfFz.woff2","assets/vazirmatn-latin-ext-700-normal-BfoXmNMx.woff2","assets/vazirmatn-latin-ext-800-normal-BzH3Tiwu.woff2","assets/vazirmatn-latin-ext-900-normal-DFoB6cWj.woff2","manifest.webmanifest","favicon.png","digikaren-logo.png","pwa/icon-192.png","pwa/icon-512.png","images/hero-reference.jpg","images/hero-shopping.jpg","images/product-accessory-set.jpg","images/product-analog-watch.jpg","images/product-art-set.jpg","images/product-auto-kit.jpg","images/product-baby-set.jpg","images/product-baby.jpg","images/product-backpack.svg","images/product-balloons.jpg","images/product-bath-towel.jpg","images/product-beauty-kit.jpg","images/product-bedroom-set.jpg","images/product-bunting.jpg","images/product-cable.jpg","images/product-care-set.jpg","images/product-ceramic-bowl.svg","images/product-cleaning-gloves.jpg","images/product-cleaning-set.jpg","images/product-cleaning-spray.jpg","images/product-coffee-bag.jpg","images/product-coffee.jpg","images/product-colored-pencils.jpg","images/product-console.jpg","images/product-convertible.jpg","images/product-cookware-set.jpg","images/product-desk-lamp.jpg","images/product-desk-notebook.jpg","images/product-dishsoap.svg","images/product-document-folder.jpg","images/product-drill.jpg","images/product-dumbbells.jpg","images/product-duvet.jpg","images/product-earbuds.jpg","images/product-fitness-set.jpg","images/product-fryer.jpg","images/product-game-kit.jpg","images/product-garden-gloves.jpg","images/product-garden-set.jpg","images/product-garden-trowel.jpg","images/product-gift-box.jpg","images/product-grocery.jpg","images/product-handmade-set.jpg","images/product-headphone.jpg","images/product-home-set.jpg","images/product-keyboard.jpg","images/product-led-bulb.jpg","images/product-lighting-set.jpg","images/product-lipstick.jpg","images/product-microfiber-cloth.jpg","images/product-mobile-kit.jpg","images/product-monitor.jpg","images/product-mouse.jpg","images/product-music-keyboard.svg","images/product-music-set.jpg","images/product-night-light.jpg","images/product-notebook.svg","images/product-oats.jpg","images/product-office-set.jpg","images/product-pantry-set.jpg","images/product-paper-plates.jpg","images/product-party-cups.jpg","images/product-party-set.jpg","images/product-pasta.jpg","images/product-pencil-holder.jpg","images/product-perfume.jpg","images/product-pet-bowl.jpg","images/product-pet-brush.jpg","images/product-pet-food.jpg","images/product-pet-set.jpg","images/product-pet-toy.jpg","images/product-phone-case.jpg","images/product-phone.jpg","images/product-pillow.jpg","images/product-plant.jpg","images/product-powerbank.jpg","images/product-resistance-band.svg","images/product-router.jpg","images/product-samsung.jpg","images/product-scrub-brush.jpg","images/product-shampoo.jpg","images/product-skincare.jpg","images/product-sneaker.jpg","images/product-soap.jpg","images/product-stapler.jpg","images/product-sticky-notes.jpg","images/product-storage-basket.jpg","images/product-string-lights.jpg","images/product-sunglasses.jpg","images/product-tambourine.svg","images/product-tea.svg","images/product-tee.jpg","images/product-toothbrush.jpg","images/product-tuner.svg","images/product-ukulele.svg","images/product-watch.jpg","images/product-water-bottle.jpg","images/product-watering-can.jpg","images/product-wooden-spoon.svg","images/product-workspace-set.jpg","images/product-woven-mat.svg","images/product-yoga-mat.jpg","images/promo-beauty.jpg","images/promo-tech.jpg"]
const scopeUrl = self.registration.scope
const scopePath = new URL(scopeUrl).pathname
// Different deployments on the same origin must not delete each other's caches.
const CACHE_PREFIX = `digikaren-shell-${encodeURIComponent(scopePath)}-`
const CACHE_NAME = `${CACHE_PREFIX}ff297698d6bd5ee3`
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
