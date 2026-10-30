import React, { useEffect, useRef, useState } from 'react'
import {
  ArrowLeft, ChevronDown, ChevronLeft, Clock3, FileText, GitCompareArrows, Heart,
  Info, LockKeyhole, NotebookPen, ShoppingBag, Trash2, UserRound,
} from 'lucide-react'
import { assetUrl } from './assets'
import { followProductLink, viewUrl } from './navigation'
import { MAX_NOTE_LENGTH, MAX_NOTES, MAX_RECEIPTS } from './personal-data'

const fa = (number) => new Intl.NumberFormat('fa-IR').format(number)

function PersonalBreadcrumbs({ go, title }) {
  return <nav className="breadcrumbs personal-breadcrumbs" aria-label="مسیر صفحه">
    <button type="button" onClick={() => go({ type: 'home' })}>دیجی‌کارن</button><ChevronLeft size={14} />
    {title !== 'فضای من' && <><button type="button" onClick={() => go({ type: 'workspace' })}>فضای من</button><ChevronLeft size={14} /></>}
    <span>{title}</span>
  </nav>
}

export function WorkspacePage({ products, favorites, recent, compareIds, cart, notes, receipts, city, staticDemo, go, openCart, onRequestClear }) {
  const countCart = Object.values(cart).reduce((sum, count) => sum + count, 0)
  const noteIds = Object.keys(notes)
  const items = [
    { key: 'cart', title: 'سبد خرید', description: 'کالاهایی که برای بررسی انتخاب کرده‌ای', count: countCart, unit: 'کالا', Icon: ShoppingBag, tone: 'blue', action: openCart, ids: Object.keys(cart) },
    { key: 'favorites', title: 'علاقه‌مندی‌ها', description: 'انتخاب‌های ذخیره‌شده برای بعد', count: favorites.length, unit: 'کالا', Icon: Heart, tone: 'rose', action: () => go({ type: 'favorites' }), ids: favorites },
    { key: 'recent', title: 'بازدیدهای اخیر', description: 'کالاهایی که به‌تازگی دیده‌ای', count: recent.length, unit: 'کالا', Icon: Clock3, tone: 'teal', action: () => go({ type: 'recent' }), ids: recent },
    { key: 'compare', title: 'فهرست مقایسه', description: 'بررسی ویژگی‌ها در کنار هم', count: compareIds.length, unit: 'کالا', Icon: GitCompareArrows, tone: 'violet', action: () => go({ type: 'compare', ids: compareIds }), ids: compareIds },
    { key: 'notes', title: 'یادداشت‌های من', description: 'نکته‌های شخصی درباره کالاها', count: noteIds.length, unit: 'یادداشت', Icon: NotebookPen, tone: 'amber', action: () => go({ type: 'notes' }), ids: noteIds },
    { key: 'receipts', title: 'رسیدهای آزمایشی', description: 'خلاصه سفارش‌های آزمایشی این مرورگر', count: receipts.length, unit: 'رسید', Icon: FileText, tone: 'sky', action: () => go({ type: 'receipts' }), ids: [] },
  ]
  const controls = [
    { key: 'cart', title: 'سبد خرید', count: countCart },
    { key: 'favorites', title: 'علاقه‌مندی‌ها', count: favorites.length },
    { key: 'recent', title: 'بازدیدهای اخیر', count: recent.length },
    { key: 'compare', title: 'فهرست مقایسه', count: compareIds.length },
    { key: 'notes', title: 'یادداشت‌های شخصی', count: noteIds.length },
    { key: 'receipts', title: 'رسیدهای آزمایشی', count: receipts.length },
    { key: 'city', title: 'شهر انتخاب‌شده', detail: city, reset: true, disabled: city === 'تهران' },
  ]
  return <main className="container-wide personal-page workspace-page">
    <PersonalBreadcrumbs go={go} title="فضای من" />
    <section className="personal-hero workspace-hero">
      <div><span className="personal-eyebrow"><LockKeyhole size={15} /> اطلاعات همین مرورگر</span><h1>فضای خرید من</h1><p>انتخاب‌هایت را یک‌جا ببین و برای سرزدن دوباره نگه دار. این بخش حساب کاربری یا ورود واقعی نیست.</p><button type="button" onClick={() => go({ type: 'help', topic: 'privacy' })}>درباره نگهداری اطلاعات <ArrowLeft size={15} /></button></div>
      <div className="workspace-hero-art" aria-hidden="true"><span><ShoppingBag size={43} strokeWidth={1.45} /></span><i><Heart size={20} /></i><b><NotebookPen size={19} /></b></div>
    </section>
    <div className="personal-section-heading"><div><span className="heading-eyebrow">همه‌چیز برای یک انتخاب خوب</span><h2>انتخاب‌های من</h2></div><span>فقط در این مرورگر</span></div>
    <div className="workspace-cards">{items.map(({ key, title, description, count, unit, Icon, tone, action, ids }) => {
      const thumbnails = ids.slice(0, 3).map((id) => products.find((product) => product.id === id)).filter(Boolean)
      return <button type="button" className="workspace-card" data-tone={tone} key={key} onClick={action}>
        <span className="workspace-card-top"><span className="workspace-card-icon"><Icon size={21} /></span><span className="workspace-card-count"><b>{fa(count)}</b> {unit}</span></span>
        <strong>{title}</strong><span className="workspace-card-description">{description}</span>
        <span className="workspace-card-bottom"><span className="workspace-card-thumbs" aria-hidden="true">{thumbnails.map((product) => <img key={product.id} src={assetUrl(product.image)} alt="" />)}</span><span>مشاهده <ArrowLeft size={15} /></span></span>
      </button>
    })}</div>
    <section className="data-management" aria-labelledby="data-management-heading">
      <div className="data-management-intro"><span><LockKeyhole size={21} /></span><div><h2 id="data-management-heading">مدیریت داده‌های این مرورگر</h2><p>گروه‌های داده را جداگانه پاک کن یا شهر را بازنشانی کن. این کار حافظهٔ آفلاین وب‌اپ یا داده‌های سرور آزمایشی را پاک نمی‌کند.</p></div></div>
      <div className="data-management-grid">{controls.map(({ key, title, count, detail, reset, disabled }) => <div className="data-row" key={key}><span><strong>{title}</strong><small>{reset ? `شهر فعلی: ${detail}` : `${fa(count)} مورد در مرورگر`}</small></span><button type="button" disabled={reset ? disabled : !count} aria-label={`${reset ? 'بازنشانی' : 'پاک کردن'} ${title}`} onClick={() => onRequestClear(key)}>{reset ? 'بازنشانی' : 'پاک کردن'}</button></div>)}</div>
      <p className="personal-footnote"><Info size={15} /> {staticDemo ? 'در نسخهٔ گیت‌هاب پیجز ثبت سفارش و ورود فعال نیست.' : 'حذف رسیدهای محلی، سفارش آزمایشی ذخیره‌شده در پایگاه‌داده سرور را حذف نمی‌کند.'}</p>
    </section>
  </main>
}

export function RecentPage({ products, recent, go, renderProduct, onRemove, onClear }) {
  const selected = recent.map((id) => products.find((product) => product.id === id)).filter(Boolean)
  const missing = recent.length - selected.length
  return <main className="container-wide personal-page">
    <PersonalBreadcrumbs go={go} title="بازدیدهای اخیر" />
    <div className="personal-list-heading"><div><span className="heading-eyebrow">برای ادامه جست‌وجو</span><h1>بازدیدهای اخیر</h1><p>به ترتیب آخرین بازدید، فقط در این مرورگر.</p></div>{recent.length > 0 && <button type="button" className="personal-outline-button" onClick={onClear}><Trash2 size={16} /> پاک کردن تاریخچه</button>}</div>
    {missing > 0 && <p className="personal-warning">{fa(missing)} کالا در کاتالوگ فعلی پیدا نشد؛ با پاک کردن تاریخچه می‌توانی آن‌ها را حذف کنی.</p>}
    {selected.length ? <div className="personal-product-grid">{selected.map((product) => <div className="personal-product" key={product.id}>{renderProduct(product)}<button type="button" className="personal-product-remove" aria-label={`حذف ${product.title} از بازدیدهای اخیر`} onClick={() => onRemove(product.id)}><Trash2 size={15} /> حذف از بازدیدها</button></div>)}</div> : <div className="personal-empty"><span><Clock3 size={31} /></span><h2>هنوز کالایی در این تاریخچه نیست</h2><p>وقتی صفحه یا نمایش سریع کالایی را ببینی، اینجا نمایش داده می‌شود.</p><button type="button" className="primary-button" onClick={() => go({ type: 'all' })}>مرور کالاها <ArrowLeft size={16} /></button></div>}
  </main>
}

export function NotesPage({ products, notes, go, onDelete, onClear }) {
  const entries = Object.entries(notes)
  return <main className="container-wide personal-page">
    <PersonalBreadcrumbs go={go} title="یادداشت‌های من" />
    <div className="personal-list-heading"><div><span className="heading-eyebrow">نکته‌هایی برای انتخاب بهتر</span><h1>یادداشت‌های شخصی من</h1><p>این یادداشت‌ها عمومی نیستند و فقط در این مرورگر نگهداری می‌شوند.</p></div>{entries.length > 0 && <button type="button" className="personal-outline-button" onClick={onClear}><Trash2 size={16} /> پاک کردن همه</button>}</div>
    {entries.length ? <div className="personal-notes-list">{entries.map(([id, text]) => {
      const product = products.find((item) => item.id === id)
      return <article className="personal-note-card" key={id}>
        <div className="personal-note-product">{product ? <><img src={assetUrl(product.image)} alt="" /><div><strong>{product.title}</strong><span>یادداشت شخصی</span></div></> : <div><strong>کالا در کاتالوگ فعلی پیدا نشد</strong><span dir="ltr">{id}</span></div>}</div>
        <p className="personal-note-text">{text}</p>
        <div className="personal-note-actions">{product && <a href={viewUrl({ type: 'product', id, section: 'note' })} onClick={(event) => { if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); go({ type: 'product', id, section: 'note' }, { scroll: false }) }}>مشاهده و ویرایش <ArrowLeft size={15} /></a>}<button type="button" aria-label={`حذف یادداشت ${product?.title || id}`} onClick={() => onDelete(id)}><Trash2 size={15} /> حذف یادداشت</button></div>
      </article>
    })}</div> : <div className="personal-empty"><span><NotebookPen size={31} /></span><h2>هنوز یادداشتی ننوشته‌ای</h2><p>در صفحهٔ هر کالا می‌توانی نکته‌ای برای خودت ثبت کنی؛ این یک دیدگاه عمومی نیست.</p><button type="button" className="primary-button" onClick={() => go({ type: 'all' })}>مرور کالاها <ArrowLeft size={16} /></button></div>}
  </main>
}

export function ProductNote({ productId, note = '', onSave, onDelete, go }) {
  const [draft, setDraft] = useState(note)
  const [editing, setEditing] = useState(!note)
  const [error, setError] = useState('')
  const sectionRef = useRef(null)
  const inputRef = useRef(null)
  const focusSection = () => window.requestAnimationFrame(() => sectionRef.current?.focus({ preventScroll: true }))
  useEffect(() => { setDraft(note); if (!note) setEditing(true); setError('') }, [note, productId])
  const submit = (event) => {
    event.preventDefault()
    const result = onSave(productId, draft)
    if (result === 'saved') { setEditing(false); setError(''); focusSection() }
    else if (result === 'full') setError(`می‌توانی حداکثر ${fa(MAX_NOTES)} یادداشت داشته باشی؛ ابتدا یکی را پاک کن.`)
    else if (result === 'unavailable') setError('ذخیره در این مرورگر ممکن نیست؛ تنظیمات یا فضای ذخیره‌سازی را بررسی کن.')
    else setError('یادداشت نباید خالی یا بیشتر از ۵۰۰ نویسه باشد.')
  }
  return <section className="product-personal-note" ref={sectionRef} id="personal-note" tabIndex="-1" aria-labelledby="personal-note-heading">
    <div className="product-personal-heading"><span><NotebookPen size={22} /></span><div><span className="heading-eyebrow">فقط برای خودت</span><h2 id="personal-note-heading">یادداشت شخصی من</h2><p>این یادداشت فقط در همین مرورگر ذخیره می‌شود و دیدگاه عمومی نیست؛ هر کس به مرورگر دسترسی دارد می‌تواند آن را ببیند. اطلاعات حساس ننویس.</p></div></div>
    {!editing && note ? <div className="product-note-saved"><p className="personal-note-text">{note}</p><div className="personal-note-actions"><button type="button" onClick={() => { setEditing(true); setDraft(note); window.requestAnimationFrame(() => inputRef.current?.focus()) }}>ویرایش یادداشت</button><button type="button" onClick={() => onDelete(productId)}><Trash2 size={15} /> حذف یادداشت</button><button type="button" onClick={() => go({ type: 'notes' })}>همه یادداشت‌ها <ArrowLeft size={15} /></button></div></div> : <form className="product-note-form" onSubmit={submit}>
      <label htmlFor="product-note-input">یادداشت درباره این کالا</label>
      <textarea ref={inputRef} id="product-note-input" maxLength={MAX_NOTE_LENGTH} value={draft} onChange={(event) => { setDraft(event.target.value); setError('') }} placeholder="مثلاً برای مقایسه یا خرید بعدی به چه چیزی توجه کنم؟" rows={3} aria-describedby="product-note-count" />
      <div className="product-note-form-footer"><span id="product-note-count">{fa(draft.length)} از {fa(MAX_NOTE_LENGTH)} نویسه</span><div>{note && <button type="button" className="personal-outline-button" onClick={() => { setDraft(note); setEditing(false); setError(''); focusSection() }}>انصراف</button>}<button type="submit" className="personal-solid-button" disabled={!draft.trim()}>ذخیره یادداشت</button></div></div>
      {error && <p className="personal-form-error" role="alert">{error}</p>}
    </form>}
  </section>
}

export function ReceiptsPage({ products, receipts, staticDemo, go, onDelete, onClear }) {
  return <main className="container-wide personal-page receipts-page">
    <PersonalBreadcrumbs go={go} title="رسیدهای آزمایشی" />
    <div className="personal-list-heading"><div><span className="heading-eyebrow">خلاصه بدون اطلاعات تماس</span><h1>رسیدهای آزمایشی</h1><p>حداکثر {fa(MAX_RECEIPTS)} رسید آخر، فقط در همین مرورگر؛ این فهرست سامانهٔ پیگیری یا سفارش واقعی نیست.</p></div>{receipts.length > 0 && <button type="button" className="personal-outline-button" onClick={onClear}><Trash2 size={16} /> پاک کردن همه رسیدها</button>}</div>
    <p className="personal-warning">{staticDemo ? 'در نسخهٔ گیت‌هاب پیجز امکان ثبت سفارش وجود ندارد. هیچ پرداخت یا ارسالی انجام نمی‌شود.' : 'حذف رسید از مرورگر، رکورد سفارش آزمایشی در پایگاه‌دادهٔ سرور را حذف نمی‌کند. پرداخت و ارسال واقعی انجام نشده است.'}</p>
    {receipts.length ? <div className="receipt-list">{receipts.map((receipt) => <details className="receipt-card" key={receipt.reference}>
      <summary><span className="receipt-card-icon"><FileText size={20} /></span><span className="receipt-card-heading"><strong>سفارش آزمایشی <b dir="ltr">{receipt.reference}</b></strong><small>{new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(receipt.createdAt))} · {fa(receipt.itemCount)} کالا</small></span><span className="receipt-card-total">{fa(receipt.total)} <small>تومان</small></span><ChevronDown size={17} /></summary>
      <div className="receipt-card-details"><div className="receipt-demo-label">فقط آزمایشی؛ نه پرداخت شده و نه ارسال خواهد شد.</div>{receipt.items.map((item) => <div className="receipt-line" key={item.id}><span>{products.some((product) => product.id === item.id) ? <a href={viewUrl({ type: 'product', id: item.id })} onClick={(event) => followProductLink(event, item.id, go)}>{item.title}</a> : item.title}<small>{fa(item.quantity)} عدد × {fa(item.unitPrice)} تومان</small></span><strong>{fa(item.quantity * item.unitPrice)} تومان</strong></div>)}<button type="button" className="receipt-delete" onClick={() => onDelete(receipt.reference)}><Trash2 size={15} /> حذف این رسید از مرورگر</button></div>
    </details>)}</div> : <div className="personal-empty"><span><FileText size={31} /></span><h2>رسید آزمایشی ذخیره‌شده‌ای نداری</h2><p>{staticDemo ? 'ثبت سفارش در نسخهٔ ایستا فعال نیست.' : 'پس از ثبت سفارش آزمایشی، خلاصه‌ای بدون نام و نشانی در این مرورگر نمایش داده می‌شود.'}</p><button type="button" className="primary-button" onClick={() => go({ type: 'workspace' })}>بازگشت به فضای من <ArrowLeft size={16} /></button></div>}
  </main>
}
