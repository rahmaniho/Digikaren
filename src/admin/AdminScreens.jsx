import React, { useEffect, useMemo, useState } from 'react'
import {
  Activity as ActivityIcon, AlertCircle, ArrowLeft, ArrowUpLeft, Boxes, CheckCircle2,
  FileText, FolderTree, Package, Pencil, Plus, RefreshCw, Search, ShoppingBag, SlidersHorizontal,
  Sparkles, Tag, TrendingUp, Users, Warehouse,
} from 'lucide-react'
import { categories } from '../data'
import { normalizeText } from '../discovery'
import { assetUrl } from '../assets'
import { csvText, ORDER_REVIEW_LABELS, ORDER_REVIEW_STATES } from './shared'
import { Badge, CardHeading, Chart, Empty, ExportButton, Select, dateTime, fa, money, shortDate } from './AdminUI'

function download(name, rows) {
  const url = URL.createObjectURL(new Blob([csvText(rows)], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a'); link.href = url; link.download = name; document.body.append(link); link.click(); link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
function filteredOrders(orders, days) {
  const since = Date.now() - days * 86400000
  return orders.filter((order) => Date.parse(order.createdAt) >= since)
}
function Pagination({ page, setPage, count, size = 10 }) {
  const pages = Math.max(1, Math.ceil(count / size)), current = Math.min(page, pages)
  return <div className="admin-pagination"><span>{fa(count)} مورد · صفحه {fa(current)} از {fa(pages)}</span><div><button type="button" onClick={() => setPage(current - 1)} disabled={current <= 1}>قبلی</button><button type="button" onClick={() => setPage(current + 1)} disabled={current >= pages}>بعدی</button></div></div>
}
function CategoryName({ product }) {
  return <>{product.categories.map((id) => categories.find((category) => category.id === id)?.label || id).join('، ')}</>
}
function ProductIdentity({ product }) {
  return <div className="admin-product-identity"><img src={assetUrl(product.image)} alt="" /><span><strong>{product.title}</strong><small dir="ltr">{product.id}</small></span></div>
}
function StockBadge({ stock, threshold }) {
  const status = stock === 0 ? 'out' : stock <= threshold ? 'low' : 'good'
  return <span className={`admin-stock admin-stock-${status}`}><i />{stock === 0 ? 'ناموجود' : `${fa(stock)} عدد`}</span>
}
function OrderTable({ orders, openOrder, compact = false }) {
  return <div className="admin-table-wrap" tabIndex="0" role="region" aria-label="جدول سفارش‌های آزمایشی"><table className="admin-table"><thead><tr><th>شناسه سفارش</th><th>تاریخ ثبت</th><th>تعداد</th><th>ارزش آزمایشی</th><th>بررسی داخلی</th><th><span className="admin-sr-only">جزئیات</span></th></tr></thead><tbody>{orders.map((order) => <tr key={order.reference}><td><b className="admin-ref" dir="ltr">{order.reference}</b></td><td>{compact ? shortDate(order.createdAt) : dateTime(order.createdAt)}</td><td>{fa(order.itemCount)} کالا</td><td><strong>{money(order.total)}</strong></td><td><Badge status={order.reviewStatus} /></td><td><button type="button" className="admin-row-link" onClick={() => openOrder(order.reference)} aria-label={`جزئیات سفارش ${order.reference}`}>جزئیات <ArrowLeft size={14} /></button></td></tr>)}</tbody></table></div>
}

export function Overview({ snapshot, threshold, go, openOrder, addProduct, staticDemo }) {
  const [days, setDays] = useState(30)
  const active = snapshot.products.filter((product) => product.active)
  const low = active.filter((product) => product.stock <= threshold).sort((a, b) => a.stock - b.stock)
  const stats = [
    { label: 'ارزش سفارش‌های آزمایشی', value: money(snapshot.totals.orderValue), hint: 'بدون پرداخت واقعی', Icon: TrendingUp, tone: 'blue' },
    { label: 'سفارش آزمایشی', value: fa(snapshot.totals.orderCount), hint: `${fa(snapshot.totals.pendingCount)} مورد نیازمند بررسی`, Icon: ShoppingBag, tone: 'violet' },
    { label: 'کالاهای قابل نمایش', value: fa(active.length), hint: `${fa(snapshot.products.length)} کالا در پنل`, Icon: Package, tone: 'teal' },
    { label: 'هشدار موجودی', value: fa(low.length), hint: `موجودی ${fa(threshold)} عدد و کمتر`, Icon: AlertCircle, tone: 'orange' },
  ]
  const statuses = ORDER_REVIEW_STATES.map((status) => ({ status, count: snapshot.orders.filter((order) => order.reviewStatus === status).length }))
  const colors = ['#4d86f4', '#f3b45d', '#68b8a7', '#b5c2d0']
  let offset = 0
  const segments = statuses.map(({ count }, index) => { const start = offset; offset += snapshot.orders.length ? count / snapshot.orders.length * 100 : 0; return `${colors[index]} ${start}% ${offset}%` })
  const ring = snapshot.orders.length ? `conic-gradient(${segments.join(', ')})` : '#eaf2ff'
  return <>
    <div className="admin-welcome"><div><span><Sparkles size={15} /> نمایی روشن از فروشگاه</span><h1>سلام، به پنل دیجی‌کارن خوش آمدید</h1><p>{staticDemo ? 'داده‌های این محیط کاملاً ساختگی هستند؛ امکانات پنل را با خیال راحت تمرین کنید.' : 'کالاها و سفارش‌های آزمایشی همین سرور را از یک‌جا مدیریت کنید.'}</p><button type="button" className="admin-welcome-link" onClick={addProduct}>افزودن کالای جدید <ArrowLeft size={16} /></button></div><div className="admin-welcome-art" aria-hidden="true"><span><Boxes size={44} /></span><i><Sparkles size={19} /></i><b><Tag size={18} /></b></div></div>
    <div className="admin-stats-grid">{stats.map(({ label, value, hint, Icon, tone }) => <article className="admin-stat" key={label}><div className={`admin-stat-icon tone-${tone}`}><Icon size={21} /></div><div><span>{label}</span><strong>{value}</strong><small>{hint}</small></div><ArrowUpLeft className="admin-stat-arrow" size={16} /></article>)}</div>
    <div className="admin-dashboard-grid">
      <section className="admin-card admin-chart-card"><CardHeading eyebrow="گزارش عملکرد" title="روند سفارش‌های آزمایشی" description="ارزش سفارش‌ها، بدون پرداخت واقعی" action={<div className="admin-segment">{[7, 30, 90].map((value) => <button type="button" className={days === value ? 'is-active' : ''} key={value} onClick={() => setDays(value)}>{fa(value)} روز</button>)}</div>} /><div className="admin-chart-summary"><strong>{money(filteredOrders(snapshot.orders, days).reduce((sum, item) => sum + item.total, 0))}</strong><span>{fa(filteredOrders(snapshot.orders, days).length)} سفارش در بازه</span></div><Chart orders={snapshot.orders} days={days} /><p className="admin-chart-footnote">بر اساس حداکثر {fa(snapshot.orderLimit)} سفارش اخیر؛ زمان‌بندی بر اساس ساعت مرورگر.</p></section>
      <section className="admin-card admin-status-card"><CardHeading eyebrow="پیگیری داخلی" title="وضعیت بررسی سفارش‌ها" description="این وضعیت‌ها به معنی ارسال نیستند." /><div className="admin-status-visual" style={{ background: ring }}><div><strong>{fa(snapshot.orders.length)}</strong><span>سفارش اخیر</span></div></div><div className="admin-status-list">{statuses.map(({ status, count }) => <div key={status}><span><i className={`admin-dot dot-${status}`} />{ORDER_REVIEW_LABELS[status]}</span><strong>{fa(count)}</strong></div>)}</div><button type="button" className="admin-inline-link" onClick={() => go('orders')}>مدیریت سفارش‌ها <ArrowLeft size={15} /></button></section>
      <section className="admin-card admin-recent-orders"><CardHeading eyebrow="آخرین فعالیت‌ها" title="سفارش‌های آزمایشی اخیر" action={<button type="button" className="admin-inline-link" onClick={() => go('orders')}>مشاهده همه <ArrowLeft size={15} /></button>} />{snapshot.orders.length ? <OrderTable orders={snapshot.orders.slice(0, 5)} openOrder={openOrder} compact /> : <Empty title="هنوز سفارش آزمایشی ثبت نشده" text="پس از ثبت سفارش آزمایشی در فروشگاه، خلاصه آن اینجا دیده می‌شود." />}</section>
      <section className="admin-card admin-low-card"><CardHeading eyebrow="نیازمند توجه" title="موجودی رو به اتمام" description={`کالاهای فعال با ${fa(threshold)} عدد و کمتر`} action={<button type="button" className="admin-inline-link" onClick={() => go('inventory')}>همه <ArrowLeft size={15} /></button>} />{low.length ? <div className="admin-low-list">{low.slice(0, 4).map((product) => <div key={product.id}><ProductIdentity product={product} /><StockBadge stock={product.stock} threshold={threshold} /></div>)}</div> : <Empty title="هشداری برای موجودی نیست" text="همه کالاهای فعال بالاتر از آستانه انتخابی‌اند." />}</section>
    </div>
  </>
}

export function Products({ products, threshold, addProduct, editProduct, toggleProduct, initialCategory, clearInitialCategory, initialQuery, clearInitialQuery }) {
  const [query, setQuery] = useState(''), [category, setCategory] = useState(initialCategory || ''), [status, setStatus] = useState('all'), [page, setPage] = useState(1)
  useEffect(() => { if (initialCategory) { setCategory(initialCategory); clearInitialCategory() } }, [initialCategory])
  useEffect(() => { if (initialQuery) { setQuery(initialQuery); clearInitialQuery() } }, [initialQuery])
  useEffect(() => setPage(1), [query, category, status])
  const items = products.filter((product) => (!query || normalizeText(`${product.title} ${product.id}`).includes(normalizeText(query))) && (!category || product.categories.includes(category)) && (status === 'all' || (status === 'active' ? product.active : !product.active)))
  const current = Math.min(page, Math.max(1, Math.ceil(items.length / 10)))
  const visible = items.slice((current - 1) * 10, current * 10)
  const exportProducts = () => download('digikaren-demo-products.csv', [['شناسه', 'نام', 'دسته', 'قیمت تومان', 'قیمت قبل', 'موجودی', 'وضعیت'], ...items.map((product) => [product.id, product.title, product.categories.map((id) => categories.find((category) => category.id === id)?.label || id).join(' / '), product.price, product.oldPrice, product.stock, product.active ? 'فعال' : 'غیرفعال'])])
  return <><div className="admin-page-heading"><div><span className="admin-eyebrow">کاتالوگ فروشگاه</span><h1>مدیریت کالاها</h1><p>قیمت، تصویر، دسته‌بندی و وضعیت نمایش کالاهای نمونه را مدیریت کنید.</p></div><div><ExportButton onClick={exportProducts} /><button type="button" className="admin-button admin-button-primary" onClick={addProduct}><Plus size={17} /> افزودن کالا</button></div></div>
    <section className="admin-card admin-list-card"><div className="admin-toolbar"><div className="admin-search"><Search size={18} /><input aria-label="جست‌وجوی کالاهای مدیریت" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="جست‌وجوی نام یا شناسه کالا" /></div><Select label="فیلتر دسته کالا" value={category} onChange={(event) => setCategory(event.target.value)}><option value="">همه دسته‌ها</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</Select><Select label="فیلتر وضعیت کالا" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">همه وضعیت‌ها</option><option value="active">فعال</option><option value="inactive">غیرفعال</option></Select></div>
      {visible.length ? <div className="admin-table-wrap" tabIndex="0" role="region" aria-label="جدول کالاها"><table className="admin-table admin-product-table"><thead><tr><th>کالا</th><th>دسته‌بندی</th><th>قیمت نمونه</th><th>موجودی</th><th>وضعیت</th><th>عملیات</th></tr></thead><tbody>{visible.map((product) => <tr key={product.id}><td><ProductIdentity product={product} /></td><td><CategoryName product={product} /></td><td><strong>{money(product.price)}</strong>{product.discount > 0 && <small className="admin-price-old">{fa(product.oldPrice)} · {fa(product.discount)}٪</small>}</td><td><StockBadge stock={product.stock} threshold={threshold} /></td><td><span className={`admin-badge ${product.active ? 'admin-status-reviewed' : 'admin-status-archived'}`}>{product.active ? 'فعال' : 'غیرفعال'}</span></td><td><div className="admin-row-actions"><button type="button" onClick={() => editProduct(product)} aria-label={`ویرایش ${product.title}`}><Pencil size={15} /></button><button type="button" onClick={() => toggleProduct(product)}>{product.active ? 'غیرفعال‌سازی' : 'فعال‌سازی'}</button></div></td></tr>)}</tbody></table></div> : <Empty title="کالایی پیدا نشد" text="جست‌وجو یا فیلترها را تغییر دهید." />}
      <Pagination page={page} setPage={setPage} count={items.length} /></section>
  </>
}

export function Inventory({ products, threshold, setStock, staticDemo }) {
  const [query, setQuery] = useState(''), [filter, setFilter] = useState('all'), [page, setPage] = useState(1)
  useEffect(() => setPage(1), [query, filter])
  const items = products.filter((product) => (!query || normalizeText(`${product.title} ${product.id}`).includes(normalizeText(query))) && (filter === 'all' || (filter === 'out' ? product.stock === 0 : product.stock > 0 && product.stock <= threshold)))
  const current = Math.min(page, Math.max(1, Math.ceil(items.length / 10)))
  const low = products.filter((product) => product.active && product.stock > 0 && product.stock <= threshold).length
  const out = products.filter((product) => product.active && product.stock === 0).length
  return <><div className="admin-page-heading"><div><span className="admin-eyebrow">کنترل موجودی</span><h1>انبار و موجودی</h1><p>{staticDemo ? 'موجودی تمرینی فقط در این مرورگر تغییر می‌کند و از فروشگاه مستقل است.' : 'موجودی نمونه را به‌روز کنید؛ سفارش آزمایشی نیز از موجودی کم می‌کند.'}</p></div><span className="admin-page-chip"><Warehouse size={16} /> آستانه هشدار: {fa(threshold)} عدد</span></div>
    <div className="admin-mini-stats"><div><span><Boxes size={19} /></span><div><small>کل کالاها</small><strong>{fa(products.length)}</strong></div></div><div><span><AlertCircle size={19} /></span><div><small>موجودی کم (فعال)</small><strong>{fa(low)}</strong></div></div><div><span><Package size={19} /></span><div><small>ناموجود (فعال)</small><strong>{fa(out)}</strong></div></div></div>
    <section className="admin-card admin-list-card"><div className="admin-toolbar"><div className="admin-search"><Search size={18} /><input aria-label="جست‌وجوی موجودی" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="جست‌وجو در موجودی" /></div><Select label="فیلتر موجودی" value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">همه موجودی‌ها</option><option value="low">موجودی کم</option><option value="out">ناموجود</option></Select></div>{items.length ? <div className="admin-table-wrap" tabIndex="0" role="region" aria-label="جدول موجودی"><table className="admin-table"><thead><tr><th>کالا</th><th>دسته‌بندی</th><th>موجودی فعلی</th><th>نمایش در فروشگاه</th><th>عملیات</th></tr></thead><tbody>{items.slice((current - 1) * 10, current * 10).map((product) => <tr key={product.id}><td><ProductIdentity product={product} /></td><td><CategoryName product={product} /></td><td><StockBadge stock={product.stock} threshold={threshold} /></td><td>{product.active ? 'فعال' : 'غیرفعال'}</td><td><button type="button" className="admin-row-link" onClick={() => setStock(product)}>تنظیم موجودی <Pencil size={14} /></button></td></tr>)}</tbody></table></div> : <Empty title="موردی پیدا نشد" text="فیلتر دیگری انتخاب کنید." />}<Pagination page={page} setPage={setPage} count={items.length} /></section></>
}

export function Orders({ snapshot, openOrder }) {
  const [query, setQuery] = useState(''), [status, setStatus] = useState('all'), [page, setPage] = useState(1)
  useEffect(() => setPage(1), [query, status])
  const items = snapshot.orders.filter((order) => (!query || normalizeText(order.reference).includes(normalizeText(query))) && (status === 'all' || order.reviewStatus === status))
  const current = Math.min(page, Math.max(1, Math.ceil(items.length / 10)))
  const exportOrders = () => download('digikaren-demo-orders.csv', [['شناسه', 'تاریخ', 'تعداد کالا', 'ارزش آزمایشی تومان', 'وضعیت بررسی'], ...items.map((order) => [order.reference, order.createdAt, order.itemCount, order.total, ORDER_REVIEW_LABELS[order.reviewStatus]])])
  return <><div className="admin-page-heading"><div><span className="admin-eyebrow">پیگیری داخلی</span><h1>سفارش‌های آزمایشی</h1><p>این سفارش‌ها پرداخت یا ارسال واقعی ندارند؛ فقط وضعیت بررسی داخلی تغییر می‌کند.</p></div><ExportButton onClick={exportOrders} /></div><div className="admin-info-strip"><FileText size={18} /><span>نمایش حداکثر {fa(snapshot.orderLimit)} سفارش اخیر. خروجی CSV شامل نام، شماره تماس و نشانی نیست.</span></div><section className="admin-card admin-list-card"><div className="admin-toolbar"><div className="admin-search"><Search size={18} /><input aria-label="جست‌وجوی سفارش" dir="ltr" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="DK-..." /></div><Select label="فیلتر وضعیت سفارش" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">همه وضعیت‌ها</option>{ORDER_REVIEW_STATES.map((item) => <option key={item} value={item}>{ORDER_REVIEW_LABELS[item]}</option>)}</Select></div>{items.length ? <OrderTable orders={items.slice((current - 1) * 10, current * 10)} openOrder={openOrder} /> : <Empty title="سفارشی پیدا نشد" text="سفارش‌های آزمایشی پس از ثبت در اینجا دیده می‌شوند." />}<Pagination page={page} setPage={setPage} count={items.length} /></section></>
}

export function Customers({ customers, loading, error, retry, staticDemo }) {
  const [query, setQuery] = useState(''), [page, setPage] = useState(1)
  useEffect(() => setPage(1), [query])
  const items = (customers || []).filter((item) => !query || normalizeText(`${item.name} ${item.phone} ${item.city}`).includes(normalizeText(query)))
  const current = Math.min(page, Math.max(1, Math.ceil(items.length / 10)))
  return <><div className="admin-page-heading"><div><span className="admin-eyebrow">دریافت‌کنندگان نمونه</span><h1>مشتریان آزمایشی</h1><p>این فهرست از فرم سفارش‌های آزمایشی ساخته می‌شود؛ حساب کاربری یا مشتری واقعی نیست.</p></div></div><div className="admin-info-strip"><Users size={18} /><span>{staticDemo ? 'نام‌ها و شماره‌ها در محیط تمرینی کاملاً ساختگی‌اند.' : 'فقط برای آزمایش از اطلاعات ساختگی استفاده کنید. این اطلاعات صرفاً در پنل احراز‌شده نمایش داده می‌شوند.'}</span></div><section className="admin-card admin-list-card"><div className="admin-toolbar"><div className="admin-search"><Search size={18} /><input aria-label="جست‌وجوی مشتری نمونه" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="نام، شهر یا شماره نمونه" /></div></div>{loading ? <Empty title="در حال دریافت اطلاعات…" /> : error ? <Empty title="دریافت اطلاعات ممکن نشد" text={error}><button type="button" className="admin-inline-link" onClick={retry}>تلاش دوباره <RefreshCw size={14} /></button></Empty> : items.length ? <div className="admin-table-wrap" tabIndex="0" role="region" aria-label="جدول مشتریان نمونه"><table className="admin-table"><thead><tr><th>نام نمونه</th><th>موبایل نمونه</th><th>شهر</th><th>سفارش آزمایشی</th><th>ارزش سفارش‌ها</th><th>آخرین ثبت</th></tr></thead><tbody>{items.slice((current - 1) * 10, current * 10).map((item) => <tr key={item.phone}><td><strong>{item.name}</strong></td><td dir="ltr">{item.phone}</td><td>{item.city}</td><td>{fa(item.orderCount)}</td><td>{money(item.orderValue)}</td><td>{shortDate(item.lastOrder)}</td></tr>)}</tbody></table></div> : <Empty title="مشتری نمونه‌ای پیدا نشد" text="با ثبت سفارش آزمایشی این فهرست پر می‌شود." />}<Pagination page={page} setPage={setPage} count={items.length} /></section></>
}

export function Reports({ snapshot }) {
  const [days, setDays] = useState(30)
  const items = filteredOrders(snapshot.orders, days)
  const total = items.reduce((sum, order) => sum + order.total, 0)
  const average = items.length ? Math.round(total / items.length) : 0
  const exportReport = () => download('digikaren-demo-report.csv', [['شناسه سفارش', 'تاریخ', 'تعداد کالا', 'ارزش آزمایشی تومان', 'وضعیت بررسی'], ...items.map((order) => [order.reference, order.createdAt, order.itemCount, order.total, ORDER_REVIEW_LABELS[order.reviewStatus]])])
  return <><div className="admin-page-heading"><div><span className="admin-eyebrow">تصویر شفاف از داده‌ها</span><h1>گزارش‌ها و تحلیل</h1><p>اعداد مربوط به سفارش‌های آزمایشی هستند و درآمد واقعی محسوب نمی‌شوند.</p></div><ExportButton onClick={exportReport} /></div><div className="admin-mini-stats"><div><span><ShoppingBag size={19} /></span><div><small>سفارش در بازه</small><strong>{fa(items.length)}</strong></div></div><div><span><TrendingUp size={19} /></span><div><small>ارزش آزمایشی در بازه</small><strong>{money(total)}</strong></div></div><div><span><SlidersHorizontal size={19} /></span><div><small>میانگین ارزش سفارش</small><strong>{money(average)}</strong></div></div></div><section className="admin-card admin-report-chart"><CardHeading title="روند ارزش سفارش‌های آزمایشی" description={`محاسبه بر اساس حداکثر ${fa(snapshot.orderLimit)} سفارش اخیر`} action={<div className="admin-segment">{[7, 30, 90].map((value) => <button type="button" className={days === value ? 'is-active' : ''} key={value} onClick={() => setDays(value)}>{fa(value)} روز</button>)}</div>} /><Chart orders={snapshot.orders} days={days} /></section><section className="admin-card admin-top-products"><CardHeading title="کالاهای پرتکرار در سفارش‌های آزمایشی" description="این آمار فقط از سفارش‌های آزمایشی همین محیط محاسبه می‌شود." />{snapshot.topProducts.length ? <div>{snapshot.topProducts.map((item, index) => <div className="admin-top-product" key={item.id}><span>{fa(index + 1)}</span><strong>{item.title}</strong><small>{fa(item.quantity)} عدد</small><b>{money(item.value)}</b></div>)}</div> : <Empty title="هنوز داده‌ای برای گزارش نیست" text="پس از ثبت سفارش آزمایشی، گزارش اینجا دیده می‌شود." />}</section></>
}

export function Categories({ products, showCategory }) {
  return <><div className="admin-page-heading"><div><span className="admin-eyebrow">ساختار کاتالوگ</span><h1>دسته‌بندی‌ها</h1><p>مرور دسته‌های موجود و کالاهای مرتبط؛ ساخت دستهٔ جدید در این نسخه فعال نیست.</p></div><span className="admin-page-chip"><FolderTree size={16} /> {fa(categories.length)} دسته اصلی</span></div><div className="admin-categories-grid">{categories.map((category) => {
    const total = products.filter((product) => product.categories.includes(category.id)).length
    const active = products.filter((product) => product.active && product.categories.includes(category.id)).length
    return <button type="button" className="admin-category-card" key={category.id} onClick={() => showCategory(category.id)}><span className="admin-category-icon"><FolderTree size={20} /></span><strong>{category.label}</strong><small>{fa(category.sub.length)} زیردسته</small><div><span>{fa(total)} کالا · {fa(active)} فعال</span><ArrowLeft size={16} /></div></button>
  })}</div></>
}

const actionLabels = { product_created: 'کالای جدید اضافه شد', product_updated: 'اطلاعات کالا به‌روزرسانی شد', product_visibility: 'وضعیت نمایش کالا تغییر کرد', order_review: 'وضعیت بررسی سفارش تغییر کرد' }
export function Activity({ activities }) {
  return <><div className="admin-page-heading"><div><span className="admin-eyebrow">ردیابی تغییرات</span><h1>فعالیت‌های پنل</h1><p>آخرین تغییرات کالا و وضعیت بررسی سفارش، بدون ذخیره مشخصات تماس.</p></div><span className="admin-page-chip"><ActivityIcon size={16} /> حداکثر ۱۰۰ فعالیت اخیر</span></div><section className="admin-card admin-activity-card">{activities.length ? activities.map((item, index) => <div className="admin-activity-row" key={`${item.id}-${index}`}><span className="admin-activity-icon">{item.action === 'order_review' ? <ShoppingBag size={17} /> : <Package size={17} />}</span><div><strong>{actionLabels[item.action] || 'تغییری در پنل ثبت شد'}</strong><small>{item.action === 'order_review' ? ORDER_REVIEW_LABELS[item.label] || 'وضعیت بررسی' : item.label} · <b dir="ltr">{item.entityId}</b></small></div><time>{dateTime(item.createdAt)}</time></div>) : <Empty title="هنوز فعالیت مدیریتی ثبت نشده" text="تغییر کالا، موجودی یا وضعیت بررسی سفارش در اینجا نمایش داده می‌شود." />}</section></>
}

export function Settings({ threshold, saveThreshold, staticDemo, resetSandbox }) {
  const [value, setValue] = useState(String(threshold)), [error, setError] = useState('')
  const submit = (event) => { event.preventDefault(); const result = saveThreshold(value); setError(result?.error || '') }
  return <><div className="admin-page-heading"><div><span className="admin-eyebrow">شخصی‌سازی پنل</span><h1>تنظیمات مدیریت</h1><p>ترجیحات همین مرورگر و اطلاعات محیط فعلی را ببینید.</p></div></div><div className="admin-settings-grid"><section className="admin-card"><CardHeading title="هشدار موجودی" description="برای شناسایی کالاهای کم‌موجود، یک آستانه انتخاب کنید." /><form className="admin-form" onSubmit={submit}><label className="admin-field"><span>هشدار برای موجودی برابر یا کمتر از</span><input inputMode="numeric" value={value} onChange={(event) => { setValue(event.target.value); setError('') }} /><small>بین ۱ تا ۹۹ عدد؛ فقط در همین مرورگر ذخیره می‌شود.</small></label>{error && <div className="admin-form-error" role="alert">{error}</div>}<button type="submit" className="admin-button admin-button-primary">ذخیره تنظیمات پنل</button></form></section><section className="admin-card"><CardHeading title="وضعیت محیط" description={staticDemo ? 'محیط تمرینی مستقل از فروشگاه عمومی' : 'پنل متصل به پایگاه‌دادهٔ آزمایشی همین سرور'} /><div className="admin-environment"><span><CheckCircle2 size={18} /></span><div><strong>{staticDemo ? 'حالت تمرینی مرورگر' : 'اتصال به سرور آزمایشی'}</strong><p>{staticDemo ? 'تغییرات فقط در این مرورگر ذخیره می‌شوند و سایت عمومی را تغییر نمی‌دهند.' : 'تغییرات کالا و موجودی در پایگاه‌دادهٔ همین سرور ذخیره می‌شوند. پرداخت و ارسال واقعی فعال نیست.'}</p></div></div>{staticDemo && <button type="button" className="admin-button admin-button-light" onClick={resetSandbox}><RefreshCw size={16} /> بازنشانی داده‌های تمرینی</button>}<p className="admin-settings-note">این پنل یک نمونهٔ مدیریتی است؛ نقش‌های چندکاربره، احراز هویت دومرحله‌ای و تنظیمات فروشگاه واقعی در آن پیاده‌سازی نشده‌اند.</p></section></div></>
}
