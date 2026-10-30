import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity, ArrowLeft, Bell, Boxes, ChartNoAxesCombined, ChevronDown, CircleHelp, FolderTree,
  LayoutDashboard, LockKeyhole, LogOut, Menu, Package, RefreshCw, Search, Settings2,
  ShieldCheck, ShoppingBag, Store, Users, X,
} from 'lucide-react'
import { assetUrl } from '../assets'
import { parsePrice } from '../discovery'
import { viewUrl } from '../navigation'
import { LOW_STOCK_DEFAULT, validateAdminProduct } from './shared'
import { getSandboxCustomers, getSandboxOrder, getSandboxSnapshot, loadSandbox, resetSandbox, saveSandboxProduct, updateSandboxOrder } from './sandbox'
import { ConfirmDialog, OrderDialog, ProductDialog, StockDialog } from './AdminDialogs'
import { Activity as ActivityScreen, Categories, Customers, Inventory, Orders, Overview, Products, Reports, Settings } from './AdminScreens'
import { Empty, fa } from './AdminUI'
import './admin.css'

const nav = [
  { id: 'overview', label: 'نمای کلی', Icon: LayoutDashboard },
  { id: 'products', label: 'کالاها', Icon: Package },
  { id: 'inventory', label: 'انبار و موجودی', Icon: Boxes },
  { id: 'orders', label: 'سفارش‌های آزمایشی', Icon: ShoppingBag },
  { id: 'customers', label: 'مشتریان نمونه', Icon: Users },
  { id: 'reports', label: 'گزارش‌ها', Icon: ChartNoAxesCombined },
  { id: 'categories', label: 'دسته‌بندی‌ها', Icon: FolderTree },
  { id: 'activity', label: 'فعالیت‌ها', Icon: Activity },
  { id: 'settings', label: 'تنظیمات پنل', Icon: Settings2 },
]
const messages = { overview: 'نمای کلی', products: 'مدیریت کالاها', inventory: 'انبار و موجودی', orders: 'سفارش‌های آزمایشی', customers: 'مشتریان نمونه', reports: 'گزارش‌ها و تحلیل', categories: 'دسته‌بندی‌ها', activity: 'فعالیت‌ها', settings: 'تنظیمات پنل' }

class RequestError extends Error {
  constructor(message, status, code = '') { super(message); this.status = status; this.code = code }
}
async function request(path, { method = 'GET', body, csrf } = {}) {
  const headers = {}
  if (!['GET', 'HEAD'].includes(method)) {
    headers['X-Requested-With'] = 'DigikarenAdmin'
    if (method !== 'DELETE') headers['Content-Type'] = 'application/json'
    if (csrf) headers['X-Admin-CSRF'] = csrf
  }
  let response
  try { response = await fetch(`/api/admin${path}`, { method, headers, credentials: 'same-origin', cache: 'no-store', ...(body !== undefined ? { body: JSON.stringify(body) } : {}) }) }
  catch { throw new RequestError('اتصال به سرور برقرار نشد.', 0) }
  let result
  try { result = await response.json() } catch { throw new RequestError('پاسخ سرور معتبر نبود.', response.status) }
  if (!response.ok) throw new RequestError(result.error?.message || 'درخواست انجام نشد.', response.status, result.error?.code)
  return result
}
const sessionFailed = (failure) => failure.status === 401 || failure.code === 'CSRF'
function imageData(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('خواندن تصویر ممکن نبود.'))
    reader.readAsDataURL(file)
  })
}

function AccessScreen({ status, login, busy, error, retry, goStore }) {
  const [password, setPassword] = useState('')
  const submit = async (event) => { event.preventDefault(); await login(password); setPassword('') }
  return <div className="admin-access" dir="rtl"><div className="admin-access-card"><div className="admin-access-art"><img src={assetUrl('/digikaren-logo.png')} alt="دیجی‌کارن" /><div><span><ShieldCheck size={22} /></span><h1>مدیریت بهتر،<br />تصمیم‌های روشن‌تر.</h1><p>داشبورد یکپارچه برای کنترل کاتالوگ، موجودی و سفارش‌های آزمایشی دیجی‌کارن.</p></div><small>پنل مدیریتی نسخهٔ آزمایشی</small></div><div className="admin-access-main"><button type="button" className="admin-back-store" onClick={goStore}><ArrowLeft size={16} /> بازگشت به فروشگاه</button><span className="admin-access-icon"><LockKeyhole size={23} /></span><h2>{status === 'disabled' ? 'پنل هنوز فعال نشده' : status === 'offline' ? 'اتصال به سرور برقرار نشد' : status === 'checking' ? 'در حال بررسی نشست…' : 'ورود به پنل مدیریت'}</h2>
    {status === 'disabled' ? <><p>برای فعال‌سازی پنل نسخهٔ سروری، متغیر <code dir="ltr">DIGIKAREN_ADMIN_PASSWORD</code> را با رمز دست‌کم ۱۶ نویسه تنظیم و سرور را دوباره اجرا کنید.</p><p className="admin-access-note">روی GitHub Pages سرور و ورود مدیریتی واقعی وجود ندارد؛ آنجا فقط محیط تمرینی مستقل نمایش داده می‌شود.</p><button type="button" className="admin-button admin-button-light" onClick={retry}><RefreshCw size={16} /> بررسی دوباره</button></> : status === 'offline' ? <><p>برای ورود به پنل، سرور همین فروشگاه باید در دسترس باشد.</p><button type="button" className="admin-button admin-button-light" onClick={retry}><RefreshCw size={16} /> تلاش دوباره</button></> : status === 'login' ? <><p>رمز مدیریت تنظیم‌شده روی این سرور را وارد کنید.</p><form className="admin-form" onSubmit={submit}><label className="admin-field"><span>رمز مدیریت</span><input type="password" dir="ltr" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>{error && <div className="admin-form-error" role="alert">{error}</div>}<button type="submit" className="admin-button admin-button-primary" disabled={busy}>{busy ? 'در حال بررسی…' : 'ورود به پنل'} <ArrowLeft size={16} /></button></form><p className="admin-access-note">نشست فقط در همین سرور برقرار می‌شود. برای اطلاعات واقعی، راهکار امنیتی و احراز هویت کامل‌تری لازم است.</p></> : <p>لطفاً چند لحظه صبر کنید.</p>}
  </div></div></div>
}

export default function AdminApp({ section, go, staticDemo }) {
  const [sandbox, setSandbox] = useState(() => staticDemo ? loadSandbox() : null)
  const [auth, setAuth] = useState({ status: staticDemo ? 'sandbox' : 'checking', csrf: '' })
  const [snapshot, setSnapshot] = useState(null)
  const [snapshotError, setSnapshotError] = useState('')
  const [loginError, setLoginError] = useState('')
  const [busy, setBusy] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const sidebar = useRef(null)
  const [dialog, setDialog] = useState(null)
  const [toast, setToast] = useState(null)
  const [customers, setCustomers] = useState({ loading: false, items: null, error: '' })
  const [categoryFilter, setCategoryFilter] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [topSearch, setTopSearch] = useState('')
  const [threshold, setThreshold] = useState(() => {
    try { const stored = Number(localStorage.getItem('digikaren-admin-low-stock')); return Number.isInteger(stored) && stored >= 1 && stored <= 99 ? stored : LOW_STOCK_DEFAULT } catch { return LOW_STOCK_DEFAULT }
  })
  const data = useMemo(() => staticDemo && sandbox ? getSandboxSnapshot(sandbox.state) : snapshot, [staticDemo, sandbox, snapshot])
  const navigate = (id) => { setMenuOpen(false); go({ type: 'admin', section: id }); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const goStore = () => { setMenuOpen(false); go({ type: 'home' }) }
  const notice = (message, kind = 'success') => setToast({ message, kind, key: Date.now() })
  useEffect(() => { if (!toast) return undefined; const timer = window.setTimeout(() => setToast(null), 4500); return () => window.clearTimeout(timer) }, [toast])
  useEffect(() => {
    if (!menuOpen) return undefined
    const previous = document.activeElement
    const panel = sidebar.current
    const frame = window.requestAnimationFrame(() => panel?.querySelector('.admin-sidebar-close')?.focus())
    const keydown = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); setMenuOpen(false); return }
      if (event.key !== 'Tab' || !panel) return
      const items = [...panel.querySelectorAll('button:not([disabled]), a[href]')].filter((node) => node.getClientRects().length)
      if (!items.length) return
      const first = items[0], last = items[items.length - 1]
      if (!panel.contains(document.activeElement)) { event.preventDefault(); first.focus() }
      else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', keydown)
    document.body.classList.add('admin-menu-open')
    return () => { window.cancelAnimationFrame(frame); document.removeEventListener('keydown', keydown); document.body.classList.remove('admin-menu-open'); if (previous?.isConnected) previous.focus() }
  }, [menuOpen])
  const expireSession = useCallback((message = '') => {
    setAuth({ status: 'login', csrf: '' }); setSnapshot(null); setSnapshotError(''); setCustomers({ loading: false, items: null, error: '' }); setDialog(null); setLoginError(message)
  }, [])

  const checkSession = useCallback(async () => {
    if (staticDemo) return
    setAuth({ status: 'checking', csrf: '' }); setSnapshot(null); setSnapshotError('')
    try {
      const session = await request('/session')
      if (!session.enabled) { setAuth({ status: 'disabled', csrf: '' }); return }
      if (!session.authenticated) { expireSession(); return }
      setAuth({ status: 'authenticated', csrf: session.csrf })
      try { setSnapshot(await request('/snapshot')) } catch (failure) { if (sessionFailed(failure)) expireSession(); else setSnapshotError(failure.message) }
    } catch { setAuth({ status: 'offline', csrf: '' }) }
  }, [staticDemo, expireSession])
  useEffect(() => { checkSession() }, [checkSession])

  const refresh = async () => {
    if (staticDemo) { const next = loadSandbox(); setSandbox(next); notice(next.storage ? 'اطلاعات تمرینی به‌روز شد.' : 'حافظهٔ مرورگر در دسترس نیست.', next.storage ? 'success' : 'error'); return }
    try { setSnapshotError(''); setSnapshot(await request('/snapshot')); notice('اطلاعات پنل به‌روز شد.') } catch (failure) { if (sessionFailed(failure)) expireSession('نشست مدیریت منقضی شده است؛ دوباره وارد شوید.'); else { setSnapshotError(failure.message); notice(failure.message, 'error') } }
  }
  const login = async (password) => {
    setBusy(true); setLoginError('')
    try {
      const session = await request('/session', { method: 'POST', body: { password } })
      setAuth({ status: 'authenticated', csrf: session.csrf })
      try { setSnapshot(await request('/snapshot')); setSnapshotError('') } catch (failure) { if (sessionFailed(failure)) expireSession('نشست مدیریت منقضی شده است؛ دوباره وارد شوید.'); else setSnapshotError(failure.message) }
    } catch (failure) { setLoginError(failure.message || 'اتصال به سرور برقرار نشد.') } finally { setBusy(false) }
  }
  const logout = async () => {
    setBusy(true)
    try { await request('/session', { method: 'DELETE', csrf: auth.csrf }); expireSession() } catch (failure) { if (sessionFailed(failure)) expireSession(); else notice(failure.message || 'خروج انجام نشد.', 'error') } finally { setBusy(false) }
  }
  const loadCustomers = useCallback(async () => {
    if (staticDemo && sandbox) { setCustomers({ loading: false, items: getSandboxCustomers(sandbox.state), error: '' }); return }
    if (auth.status !== 'authenticated') return
    setCustomers({ loading: true, items: null, error: '' })
    try { const result = await request('/customers'); setCustomers({ loading: false, items: result.customers, error: '' }) } catch (failure) { if (sessionFailed(failure)) expireSession('نشست مدیریت منقضی شده است؛ دوباره وارد شوید.'); else setCustomers({ loading: false, items: null, error: failure.message }) }
  }, [staticDemo, sandbox, auth.status, expireSession])
  useEffect(() => { if (section === 'customers') loadCustomers() }, [section, loadCustomers])

  // A successful mutation must not be reported as failed just because the
  // subsequent refresh failed; retrying a committed request can duplicate work.
  const refreshAfterCommit = async () => {
    try { setSnapshot(await request('/snapshot')); setSnapshotError(''); return 'ok' }
    catch (failure) {
      if (sessionFailed(failure)) { expireSession('تغییر ذخیره شد، اما نشست پایان یافته است؛ دوباره وارد شوید.'); return 'expired' }
      setSnapshot(null); setSnapshotError('تغییر ذخیره شد، اما به‌روزرسانی اطلاعات ممکن نشد. دوباره تلاش کنید.'); return 'unavailable'
    }
  }

  const saveProduct = async (input, isNew, file) => {
    const initial = validateAdminProduct(input, { allowDataImage: staticDemo })
    if (initial.error) return { error: initial.error }
    setBusy(true)
    try {
      let payload = { ...input }
      if (file) {
        const limit = staticDemo ? 200 * 1024 : 2 * 1024 * 1024
        if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > limit || !file.size) throw new Error(staticDemo ? 'تصویر تمرینی باید PNG، JPEG یا WebP و حداکثر ۲۰۰ کیلوبایت باشد.' : 'تصویر باید PNG، JPEG یا WebP و حداکثر ۲ مگابایت باشد.')
        const image = await imageData(file)
        payload.image = staticDemo ? image : (await request('/uploads', { method: 'POST', body: { data: image }, csrf: auth.csrf })).image
      }
      let refreshState = 'ok'
      if (staticDemo) {
        const result = saveSandboxProduct(sandbox.state, payload, isNew)
        if (result.error) return result
        setSandbox({ state: result.state, storage: true })
      } else {
        await request(isNew ? '/products' : `/products/${encodeURIComponent(payload.id)}`, { method: isNew ? 'POST' : 'PUT', body: payload, csrf: auth.csrf })
        refreshState = await refreshAfterCommit()
      }
      setDialog(null)
      if (refreshState !== 'expired') notice(refreshState === 'ok' ? (isNew ? 'کالا اضافه شد.' : 'تغییرات کالا ذخیره شد.') : 'کالا ذخیره شد، اما دریافت دوباره اطلاعات ممکن نشد.', refreshState === 'ok' ? 'success' : 'error')
      return { ok: true }
    } catch (failure) {
      if (sessionFailed(failure)) expireSession('نشست مدیریت منقضی شده است؛ دوباره وارد شوید.')
      return { error: failure.message || 'ذخیره کالا ممکن نشد.' }
    } finally { setBusy(false) }
  }
  const toggleProduct = (product) => setDialog({ type: 'confirm', title: product.active ? 'غیرفعال‌سازی کالا' : 'فعال‌سازی کالا', message: product.active ? `«${product.title}» از کاتالوگ این محیط پنهان می‌شود، اما سوابق سفارش حفظ می‌شوند.` : `«${product.title}» دوباره در کاتالوگ این محیط نمایش داده می‌شود.`, confirmLabel: product.active ? 'غیرفعال شود' : 'فعال شود', onConfirm: async () => { const result = await saveProduct({ ...product, active: !product.active }, false, null); if (result.error) notice(result.error, 'error') } })
  const openOrder = async (reference) => {
    try {
      const order = staticDemo ? getSandboxOrder(sandbox.state, reference) : (await request(`/orders/${encodeURIComponent(reference)}`)).order
      if (!order) throw new Error('سفارش پیدا نشد.')
      setDialog({ type: 'order', order })
    } catch (failure) { if (sessionFailed(failure)) expireSession('نشست مدیریت منقضی شده است؛ دوباره وارد شوید.'); else notice(failure.message || 'دریافت سفارش ممکن نشد.', 'error') }
  }
  const updateOrder = async (order, reviewStatus) => {
    setBusy(true)
    try {
      let version, refreshState = 'ok'
      if (staticDemo) {
        const result = updateSandboxOrder(sandbox.state, order.reference, reviewStatus, order.version)
        if (result.error) return result
        setSandbox({ state: result.state, storage: true }); version = result.version
      } else {
        const result = await request(`/orders/${encodeURIComponent(order.reference)}`, { method: 'PATCH', body: { reviewStatus, version: order.version }, csrf: auth.csrf })
        version = result.version; refreshState = await refreshAfterCommit()
      }
      if (refreshState !== 'expired') {
        setDialog({ type: 'order', order: { ...order, reviewStatus, version } })
        notice(refreshState === 'ok' ? 'وضعیت بررسی داخلی ذخیره شد.' : 'وضعیت ذخیره شد، اما دریافت دوباره اطلاعات ممکن نشد.', refreshState === 'ok' ? 'success' : 'error')
      }
      return { ok: true }
    } catch (failure) { if (sessionFailed(failure)) expireSession('نشست مدیریت منقضی شده است؛ دوباره وارد شوید.'); return { error: failure.message || 'ذخیره وضعیت ممکن نشد.' } } finally { setBusy(false) }
  }
  const saveThreshold = (value) => {
    const parsed = parsePrice(value)
    if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > 99) return { error: 'آستانه باید عددی بین ۱ تا ۹۹ باشد.' }
    try { localStorage.setItem('digikaren-admin-low-stock', String(parsed)) } catch { return { error: 'ذخیره تنظیمات در مرورگر ممکن نیست.' } }
    setThreshold(parsed); notice('آستانه هشدار ذخیره شد.'); return { ok: true }
  }
  const confirmReset = () => setDialog({ type: 'confirm', title: 'بازنشانی محیط تمرینی', message: 'همه تغییرات تمرینی این پنل در همین مرورگر پاک و داده‌های ساختگی اولیه جایگزین می‌شوند. این کار به سبد، یادداشت‌های شخصی یا پایگاه‌دادهٔ سرور دست نمی‌زند.', confirmLabel: 'بازنشانی محیط', onConfirm: () => { const result = resetSandbox(); if (result.error) { notice(result.error, 'error'); return }; setSandbox({ state: result.state, storage: true }); setDialog(null); notice('محیط تمرینی بازنشانی شد.') } })
  const searchSubmit = (event) => { event.preventDefault(); if (!topSearch.trim()) return; setProductSearch(topSearch.trim()); navigate('products') }
  const showCategory = (id) => { setCategoryFilter(id); navigate('products') }
  const lowCount = data?.products.filter((product) => product.active && product.stock <= threshold).length || 0

  if (!staticDemo && auth.status !== 'authenticated') return <AccessScreen status={auth.status} login={login} busy={busy} error={loginError} retry={checkSession} goStore={goStore} />

  let page
  if (!data) page = <section className="admin-card admin-loading">{snapshotError ? <Empty title="دریافت اطلاعات ممکن نشد" text={snapshotError}><button type="button" className="admin-inline-link" onClick={refresh}>تلاش دوباره <RefreshCw size={15} /></button></Empty> : <Empty title="در حال دریافت داده‌ها…" />}</section>
  else if (section === 'overview') page = <Overview snapshot={data} threshold={threshold} go={navigate} openOrder={openOrder} addProduct={() => setDialog({ type: 'product', isNew: true })} staticDemo={staticDemo} />
  else if (section === 'products') page = <Products products={data.products} threshold={threshold} addProduct={() => setDialog({ type: 'product', isNew: true })} editProduct={(product) => setDialog({ type: 'product', product, isNew: false })} toggleProduct={toggleProduct} initialCategory={categoryFilter} clearInitialCategory={() => setCategoryFilter('')} initialQuery={productSearch} clearInitialQuery={() => setProductSearch('')} />
  else if (section === 'inventory') page = <Inventory products={data.products} threshold={threshold} staticDemo={staticDemo} setStock={(product) => setDialog({ type: 'stock', product })} />
  else if (section === 'orders') page = <Orders snapshot={data} openOrder={openOrder} />
  else if (section === 'customers') page = <Customers customers={customers.items} loading={customers.loading} error={customers.error} retry={loadCustomers} staticDemo={staticDemo} />
  else if (section === 'reports') page = <Reports snapshot={data} />
  else if (section === 'categories') page = <Categories products={data.products} showCategory={showCategory} />
  else if (section === 'activity') page = <ActivityScreen activities={data.activities} />
  else page = <Settings threshold={threshold} saveThreshold={saveThreshold} staticDemo={staticDemo} resetSandbox={confirmReset} />

  return <div className="admin-app" dir="rtl">
    {menuOpen && <button type="button" className="admin-mobile-backdrop" aria-label="بستن فهرست مدیریت" onClick={() => setMenuOpen(false)} />}
    <aside ref={sidebar} className={`admin-sidebar${menuOpen ? ' admin-sidebar-open' : ''}`} aria-label="ناوبری مدیریت"><div className="admin-sidebar-brand"><button type="button" onClick={() => navigate('overview')} aria-label="نمای کلی مدیریت"><img src={assetUrl('/digikaren-logo.png')} alt="دیجی‌کارن" /></button><button type="button" className="admin-sidebar-close" onClick={() => setMenuOpen(false)} aria-label="بستن فهرست"><X size={19} /></button><span>پنل مدیریت</span></div><div className="admin-sidebar-label">منوی اصلی <span>MAIN MENU</span></div><nav>{nav.map(({ id, label, Icon }) => <button type="button" key={id} className={section === id ? 'is-active' : ''} aria-current={section === id ? 'page' : undefined} onClick={() => navigate(id)}><Icon size={19} /><span>{label}</span>{id === 'inventory' && lowCount > 0 && <b>{fa(lowCount)}</b>}</button>)}</nav><div className="admin-sidebar-bottom"><div className="admin-sidebar-hint"><span><CircleHelp size={18} /></span><div><strong>راهنمای محیط</strong><small>{staticDemo ? 'داده‌ها فقط تمرینی هستند' : 'سرور و سفارش‌ها آزمایشی‌اند'}</small></div></div><a href={viewUrl({ type: 'home' }, window.location.pathname)} onClick={(event) => { if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); goStore() }}><Store size={17} /> مشاهده فروشگاه <ArrowLeft size={15} /></a>{!staticDemo && <button type="button" onClick={logout} disabled={busy}><LogOut size={17} /> خروج از پنل</button>}</div></aside>
    <div className="admin-main"><header className="admin-topbar"><div className="admin-topbar-title"><button type="button" className="admin-icon-button admin-menu-button" aria-label="باز کردن فهرست مدیریت" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}><Menu size={21} /></button><div><span>پنل مدیریت / {messages[section]}</span><strong>فضای مدیریت دیجی‌کارن</strong></div></div><form className="admin-top-search" onSubmit={searchSubmit}><Search size={18} /><input aria-label="جست‌وجوی سراسری کالا" value={topSearch} onChange={(event) => setTopSearch(event.target.value)} placeholder="جست‌وجو در کالاها..." /><kbd>Enter</kbd></form><div className="admin-top-actions"><button type="button" className="admin-icon-button" onClick={refresh} disabled={busy} aria-label="به‌روزرسانی اطلاعات"><RefreshCw size={19} /></button><button type="button" className="admin-icon-button admin-alert-button" onClick={() => navigate('inventory')} aria-label={`هشدار موجودی، ${fa(lowCount)} کالا`}><Bell size={19} />{lowCount > 0 && <i />}</button><div className="admin-profile"><span>م</span><div><strong>مدیر فروشگاه</strong><small>{staticDemo ? 'محیط تمرینی' : 'سرور آزمایشی'}</small></div><ChevronDown size={15} /></div></div></header>
      <main className="admin-content"><div className={`admin-mode-notice ${staticDemo ? 'is-sandbox' : ''}`} role="note"><span><ShieldCheck size={18} /></span><div><strong>{staticDemo ? 'محیط تمرینی مستقل — داده‌ها ساختگی‌اند' : 'پنل متصل به سرور آزمایشی'}</strong><p>{staticDemo ? 'تغییرات فقط در همین مرورگر ذخیره می‌شوند و فروشگاه عمومی یا دادهٔ دیگر کاربران را تغییر نمی‌دهند؛ اطلاعات حساس وارد نکنید.' : 'تغییرات کالا و موجودی روی همین سرور ذخیره می‌شوند؛ سفارش‌ها، پرداخت و ارسال واقعی نیستند.'}</p>{staticDemo && !sandbox.storage && <p>ذخیره‌سازی مرورگر در دسترس نیست؛ تغییرات قابل نگهداری نخواهند بود.</p>}{staticDemo && sandbox.recovered && <p>داده‌های تمرینی ناسازگار بودند؛ نمونهٔ اولیه نمایش داده می‌شود. برای ویرایش، محیط را از تنظیمات بازنشانی کنید.</p>}</div><button type="button" onClick={() => navigate('settings')}>جزئیات <ArrowLeft size={14} /></button></div>{snapshotError && data && <div className="admin-info-strip" role="alert"><span>{snapshotError}؛ اطلاعات نمایش‌داده‌شده ممکن است قدیمی باشند.</span><button type="button" className="admin-inline-link" onClick={refresh}>تلاش دوباره <RefreshCw size={14} /></button></div>}{page}<div className="admin-content-footer"><span>دیجی‌کارن · پنل مدیریت نسخهٔ آزمایشی</span><span>اطلاعات و سفارش‌ها نمونه هستند.</span></div></main>
    </div>
    {toast && <div className={`admin-toast admin-toast-${toast.kind}`} role={toast.kind === 'error' ? 'alert' : 'status'}>{toast.message}</div>}
    {dialog?.type === 'product' && <ProductDialog product={dialog.product} isNew={dialog.isNew} staticDemo={staticDemo} close={() => setDialog(null)} onSave={saveProduct} busy={busy} />}
    {dialog?.type === 'stock' && <StockDialog product={dialog.product} close={() => setDialog(null)} onSave={saveProduct} busy={busy} staticDemo={staticDemo} />}
    {dialog?.type === 'order' && <OrderDialog order={dialog.order} close={() => setDialog(null)} onUpdate={updateOrder} busy={busy} staticDemo={staticDemo} />}
    {dialog?.type === 'confirm' && <ConfirmDialog {...dialog} close={() => setDialog(null)} busy={busy} />}
  </div>
}
