import React from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/vazirmatn/400.css'
import '@fontsource/vazirmatn/500.css'
import '@fontsource/vazirmatn/600.css'
import '@fontsource/vazirmatn/700.css'
import '@fontsource/vazirmatn/800.css'
import '@fontsource/vazirmatn/900.css'
import './styles.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(<App />)

// The development server deliberately does not install a worker, preventing
// old build caches from masking live source changes. Production works at either
// the site root or the GitHub Pages project subpath.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL })
      .catch((error) => console.warn('Offline app registration failed:', error))
  })
}
