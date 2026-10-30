import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { categories, products, slides } from '../src/data.js'

const hasPublicAsset = (url) => existsSync(new URL(`../public${url}`, import.meta.url))

test('catalog IDs are unique and all category pages have products', () => {
  const categoryIds = categories.map((category) => category.id)
  const productIds = products.map((product) => product.id)
  assert.equal(new Set(categoryIds).size, categoryIds.length)
  assert.equal(new Set(productIds).size, productIds.length)
  for (const category of categories) {
    assert.ok(products.some((product) => product.categories.includes(category.id)), category.label)
    assert.ok(hasPublicAsset(category.image), category.image)
  }
})

test('product prices, discounts, categories and image paths are consistent', () => {
  const categoryIds = new Set(categories.map((category) => category.id))
  for (const product of products) {
    assert.ok(hasPublicAsset(product.image), product.image)
    assert.ok(product.categories.length && product.categories.every((id) => categoryIds.has(id)), product.id)
    assert.ok(product.price > 0 && product.oldPrice > product.price, product.id)
    assert.ok(Math.abs((1 - product.price / product.oldPrice) * 100 - product.discount) < 1, product.id)
    assert.ok(product.features.length > 0, product.id)
  }
})

test('campaigns reference existing assets and categories', () => {
  for (const slide of slides) {
    assert.ok(hasPublicAsset(slide.image), slide.image)
    assert.ok(['all', 'deals'].includes(slide.target) || categories.some((category) => category.id === slide.target))
  }
})


test('user-provided brand assets and display derivatives exist', () => {
  for (const path of ['/brand/logo-original.png', '/brand/icon-original.png', '/brand/banner-original.png', '/digikaren-logo.png', '/favicon.png', '/images/hero-reference.jpg']) {
    assert.ok(hasPublicAsset(path), path)
  }
})


test('each subcategory is valid, populated and assigned consistently', () => {
  for (const category of categories) {
    const ids = category.sub.map((item) => item.id)
    assert.equal(new Set(ids).size, ids.length, category.id)
    for (const item of category.sub) {
      assert.ok(item.id && item.label, category.id)
      assert.ok(products.some((product) => product.categories.includes(category.id) && product.subcategories?.[category.id]?.includes(item.id)), `${category.id}/${item.id}`)
    }
  }
  for (const product of products) {
    assert.deepEqual(Object.keys(product.subcategories).sort(), [...product.categories].sort(), product.id)
    for (const categoryId of product.categories) {
      const category = categories.find((item) => item.id === categoryId)
      const assigned = product.subcategories[categoryId]
      assert.ok(assigned.length > 0 && new Set(assigned).size === assigned.length, product.id)
      assert.ok(assigned.every((id) => category.sub.some((item) => item.id === id)), `${product.id}/${categoryId}`)
    }
  }
})

test('expanded departments expose their intended products and cross-list the existing laptop', () => {
  const expected = [
    ['computer', 'laptops', 'convertible'], ['computer', 'monitors', 'monitor'],
    ['computer', 'peripherals', 'computer-keyboard'], ['computer', 'network', 'network-router'],
    ['pets', 'food', 'pet-food'], ['pets', 'essentials', 'pet-bowl'],
    ['pets', 'toys', 'pet-toy'], ['pets', 'grooming', 'pet-brush'],
    ['garden', 'plants', 'plant-pot'], ['garden', 'pots', 'plant-pot'],
    ['garden', 'tools', 'garden-trowel'], ['garden', 'watering', 'watering-can'],
    ['music', 'strings', 'ukulele'], ['music', 'keyboards', 'music-keyboard'],
    ['music', 'percussion', 'tambourine'], ['music', 'accessories', 'music-tuner'],
    ['handmade', 'ceramics', 'ceramic-bowl'], ['handmade', 'textiles', 'woven-mat'],
    ['handmade', 'wood', 'wooden-spoon'], ['handmade', 'gifts', 'craft-home-set'],
    ['beauty', 'oral', 'toothbrush'], ['beauty', 'body', 'soap'],
    ['bed-bath', 'bedding', 'cotton-duvet'], ['bed-bath', 'pillows', 'sleep-pillow'],
    ['bed-bath', 'towels', 'bath-towel'], ['bed-bath', 'organizers', 'woven-storage-basket'],
    ['bed-bath', 'accessories', 'night-light'],
    ['lighting', 'desk', 'desk-lamp'], ['lighting', 'bulbs', 'led-bulb'],
    ['lighting', 'night', 'night-light'], ['lighting', 'decorative', 'string-lights'],
    ['office', 'stationery', 'notebook'], ['office', 'filing', 'document-folder'],
    ['office', 'organization', 'pencil-holder'], ['office', 'tools', 'desk-stapler'],
    ['office', 'workspace', 'workspace-kit'],
    ['party', 'balloons', 'party-balloons'], ['party', 'tableware', 'paper-plates'],
    ['party', 'decor', 'party-bunting'], ['party', 'giftwrap', 'ribbon-gift-box'],
    ['cleaning', 'cleaners', 'dishsoap'], ['cleaning', 'cloths', 'microfiber-cloth'],
    ['cleaning', 'tools', 'scrub-brush'], ['cleaning', 'gloves', 'cleaning-gloves'],
  ]
  for (const [category, subcategory, id] of expected) {
    const item = products.find((product) => product.id === id)
    assert.ok(item?.categories.includes(category) && item.subcategories[category].includes(subcategory), `${category}/${subcategory}/${id}`)
  }
})
