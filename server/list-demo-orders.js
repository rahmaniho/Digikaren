import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createStore } from './database.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const store = createStore(process.env.DIGIKAREN_DB || path.join(root, 'var', 'digikaren.sqlite'))
console.log(JSON.stringify(store.listDemoOrders(), null, 2))
store.close()
