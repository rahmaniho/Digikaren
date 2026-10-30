// Catalog paths are stored root-relative so the same seed also works in SQLite.
// Prefix them only when rendering, including a GitHub Pages project subpath.
export function assetUrl(path, base = import.meta.env?.BASE_URL || '/') {
  if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//')) return path
  return `${base.replace(/\/$/, '')}${path}`
}
