import React, { createContext, useContext, useState } from 'react'
import { ArrowLeft, ArrowLeftRight, Check, GitCompareArrows, Info, Plus, Share2, ShoppingCart, X } from 'lucide-react'
import { assetUrl } from './assets'
import { MAX_COMPARE } from './comparison'
import { quantityAvailableToAdd } from './cart-limits'
import { followProductLink, viewUrl } from './navigation'

const fa = (number) => new Intl.NumberFormat('fa-IR').format(number)
const CompareContext = createContext({ ids: [], toggle: () => {} })

export function CompareProvider({ value, children }) {
  return <CompareContext.Provider value={value}>{children}</CompareContext.Provider>
}

export function CompareToggle({ product, className = '' }) {
  const { ids, toggle } = useContext(CompareContext)
  const selected = ids.includes(product.id)
  return <button type="button" className={`compare-toggle ${selected ? 'is-selected' : ''} ${className}`} aria-pressed={selected} aria-label={`${selected ? 'حذف از مقایسه' : 'افزودن به مقایسه'}: ${product.title}`} title={selected ? 'حذف از مقایسه' : 'افزودن به مقایسه'} onClick={() => toggle(product.id)}><GitCompareArrows size={17} /></button>
}

export function CompareDock({ ids, products, go, clear, active }) {
  if (!ids.length || active) return null
  const selected = ids.map((id) => products.find((product) => product.id === id)).filter(Boolean)
  if (!selected.length) return null
  return <aside className="compare-dock" aria-label="فهرست مقایسه">
    <span className="compare-dock-icon"><GitCompareArrows size={19} /></span>
    <div className="compare-dock-copy"><strong>انتخاب برای مقایسه</strong><span>{fa(selected.length)} از {fa(MAX_COMPARE)} کالا</span></div>
    <div className="compare-dock-images" aria-hidden="true">{selected.slice(0, 3).map((product) => <img src={assetUrl(product.image)} alt="" key={product.id} />)}</div>
    <button type="button" className="compare-dock-open" onClick={() => go({ type: 'compare', ids: selected.map((product) => product.id) })}>مقایسه کالاها <ArrowLeft size={15} /></button>
    <button type="button" className="compare-dock-clear" onClick={clear} aria-label="پاک کردن فهرست مقایسه" title="پاک کردن فهرست"><X size={17} /></button>
  </aside>
}

export function ComparePage({ ids, products, catalogStatus, cart, onAdd, onRemove, onAddMore, go, notify }) {
  const [showShareLink, setShowShareLink] = useState(false)
  const items = ids.map((id) => products.find((product) => product.id === id)).filter(Boolean)
  const shareUrl = new URL(viewUrl({ type: 'compare', ids }, window.location.pathname), window.location.origin).href
  const copyLink = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(shareUrl)
      setShowShareLink(false)
      notify('پیوند مقایسه کپی شد')
    } catch { setShowShareLink(true) }
  }
  const stockLabel = (product) => {
    if (catalogStatus === 'static') return 'موجودی واقعی مشخص نیست'
    if (catalogStatus !== 'ready') return 'موجودی آزمایشی در دسترس نیست'
    return product.stock > 0 ? `${fa(product.stock)} عدد موجودی آزمایشی` : 'ناموجود در موجودی آزمایشی'
  }
  return <main className="container-wide compare-page">
    <div className="breadcrumbs"><button type="button" onClick={() => go({ type: 'home' })}>دیجی‌کارن</button><span>‹</span><span>مقایسه کالاها</span></div>
    <div className="compare-intro">
      <div><span className="heading-eyebrow">انتخاب آگاهانه‌تر</span><h1>مقایسه کالاها</h1><p>قیمت و ویژگی‌های نمونه را کنار هم ببین. مقایسه تا {fa(MAX_COMPARE)} کالا امکان‌پذیر است.</p></div>
      <div className="compare-intro-actions">{items.length > 0 && <button type="button" className="compare-share" onClick={copyLink}><Share2 size={16} /> کپی پیوند مقایسه</button>}<button type="button" className="compare-add-more" onClick={() => onAddMore(items.map((item) => item.id))}><Plus size={16} /> افزودن کالا</button></div>
    </div>
    {showShareLink && <div className="compare-share-fallback"><label htmlFor="compare-share-url">پیوند را انتخاب و کپی کنید</label><input id="compare-share-url" dir="ltr" readOnly value={shareUrl} onFocus={(event) => event.target.select()} /></div>}
    {items.length !== ids.length && <p className="compare-warning" role="status">بعضی کالاهای این پیوند در کاتالوگ فعلی پیدا نشدند.</p>}
    {items.length === 1 && <p className="compare-hint">برای مقایسه، یک کالای دیگر هم انتخاب کن.</p>}
    {items.length > 1 && <p className="compare-scroll-hint"><ArrowLeftRight size={15} /> برای دیدن همه کالاها، جدول را به چپ و راست بکشید.</p>}
    {!items.length ? <div className="compare-empty"><span><GitCompareArrows size={34} /></span><h2>هنوز کالایی برای مقایسه انتخاب نشده</h2><p>روی نشان مقایسه در کارت یا صفحهٔ کالا بزن تا اینجا کنار هم ببینی.</p><button type="button" className="primary-button" onClick={() => onAddMore([])}>مشاهده کالاها <ArrowLeft size={16} /></button></div> : <div className="compare-table-scroll" tabIndex="0" role="region" aria-label="جدول مقایسه کالاها">
      <table className="compare-table"><thead><tr><th scope="col">مشخصات نمونه</th>{items.map((product) => <th scope="col" key={product.id}>
        <div className="compare-product-head"><button type="button" className="compare-remove" onClick={() => onRemove(product.id)} aria-label={`حذف ${product.title} از مقایسه`}><X size={17} /></button>
          <a href={viewUrl({ type: 'product', id: product.id })} onClick={(event) => followProductLink(event, product.id, go)}><img src={assetUrl(product.image)} alt="" /><strong>{product.title}</strong></a></div>
      </th>)}</tr></thead><tbody>
        <tr><th scope="row">قیمت نمونه</th>{items.map((product) => <td key={product.id}><strong>{fa(product.price)}</strong> <small>تومان</small></td>)}</tr>
        <tr><th scope="row">تخفیف نمونه</th>{items.map((product) => <td key={product.id}>{fa(product.discount)}٪</td>)}</tr>
        <tr><th scope="row">امتیاز نمونه</th>{items.map((product) => <td key={product.id}>{product.rating} از ۵ <small>({fa(product.reviews)} دیدگاه نمونه)</small></td>)}</tr>
        <tr><th scope="row">ویژگی‌ها</th>{items.map((product) => <td key={product.id}><ul>{product.features.map((feature) => <li key={feature}><Check size={14} />{feature}</li>)}</ul></td>)}</tr>
        <tr><th scope="row">وضعیت موجودی</th>{items.map((product) => <td key={product.id}>{stockLabel(product)}</td>)}</tr>
        <tr><th scope="row">سبد خرید</th>{items.map((product) => {
          const remaining = quantityAvailableToAdd(product, Number(cart[product.id]) || 0)
          return <td key={product.id}><button type="button" className="compare-cart" disabled={!remaining} onClick={() => onAdd(product.id)}><ShoppingCart size={15} />{product.stock === 0 ? 'ناموجود' : remaining ? 'افزودن به سبد' : 'حداکثر تعداد در سبد'}</button></td>
        })}</tr>
      </tbody></table>
    </div>}
    <p className="compare-disclaimer"><Info size={15} /> انتخاب‌ها فقط در مرورگر شما نگهداری می‌شوند؛ اطلاعات و قیمت‌ها نمونه‌اند.</p>
  </main>
}
