import React, { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ImagePlus, Package, Save, ShieldCheck } from 'lucide-react'
import { categories, products as seedProducts } from '../data'
import { assetUrl } from '../assets'
import { ORDER_REVIEW_LABELS, ORDER_REVIEW_STATES } from './shared'
import { Badge, Modal, dateTime, fa, money } from './AdminUI'

export function ProductDialog({ product, isNew, staticDemo, close, onSave, busy }) {
  const firstCategory = product?.categories?.[0] || categories[0].id
  const firstSub = product?.subcategories?.[firstCategory]?.[0] || categories.find((item) => item.id === firstCategory)?.sub[0]?.id || ''
  const [form, setForm] = useState({
    id: product?.id || '', title: product?.title || '', price: product?.price ?? '', oldPrice: product?.oldPrice ?? '', stock: product?.stock ?? 0,
    image: product?.image || seedProducts[0].image, features: product?.features?.join('\n') || '', active: product?.active ?? true,
    category: firstCategory, subcategory: firstSub, replaceCategories: isNew,
  })
  const [file, setFile] = useState(null)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState('')
  const options = useMemo(() => [...new Set(seedProducts.map((item) => item.image))], [])
  const selectedCategory = categories.find((item) => item.id === form.category)
  const update = (name) => (event) => { setForm((current) => ({ ...current, [name]: event.target.value })); setError('') }
  useEffect(() => {
    if (!file) { setPreview(''); return undefined }
    const url = URL.createObjectURL(file); setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])
  const submit = async (event) => {
    event.preventDefault()
    const categoryChange = isNew || form.replaceCategories
    const payload = {
      ...(product || {}), id: form.id.trim(), title: form.title, image: form.image.trim(), price: form.price, oldPrice: form.oldPrice, stock: form.stock, active: form.active,
      features: form.features.split('\n').map((item) => item.trim()).filter(Boolean),
      categories: categoryChange ? [form.category] : product.categories,
      subcategories: categoryChange ? { [form.category]: [form.subcategory] } : product.subcategories,
    }
    const result = await onSave(payload, isNew, file)
    if (result?.error) setError(result.error)
  }
  return <Modal title={isNew ? 'افزودن کالای جدید' : 'ویرایش کالا'} close={close} wide locked={busy}>
    <form className="admin-form" onSubmit={submit}>
      <div className="admin-form-grid">
        <label className="admin-field admin-field-wide"><span>نام کالا <b>*</b></span><input value={form.title} onChange={update('title')} maxLength={160} required placeholder="نام کامل و قابل جست‌وجوی کالا" /></label>
        <label className="admin-field"><span>شناسه انگلیسی کالا <b>*</b></span><input dir="ltr" value={form.id} onChange={update('id')} disabled={!isNew} maxLength={50} required placeholder="example-product" /><small>پس از ساخت قابل تغییر نیست.</small></label>
        <label className="admin-field"><span>موجودی آزمایشی <b>*</b></span><input inputMode="numeric" value={form.stock} onChange={update('stock')} required placeholder="۰" /></label>
        <label className="admin-field"><span>قیمت فعلی (تومان) <b>*</b></span><input inputMode="numeric" value={form.price} onChange={update('price')} required placeholder="مثلاً ۲۵۰٬۰۰۰" /></label>
        <label className="admin-field"><span>قیمت قبل از تخفیف (تومان) <b>*</b></span><input inputMode="numeric" value={form.oldPrice} onChange={update('oldPrice')} required placeholder="در صورت نبود تخفیف، برابر قیمت فعلی" /></label>
        {!isNew && <div className="admin-field admin-field-wide"><span>دسته‌بندی فعلی</span><p className="admin-existing-categories">{product.categories.map((id) => categories.find((item) => item.id === id)?.label || id).join('، ')}</p><label className="admin-check"><input type="checkbox" checked={form.replaceCategories} onChange={(event) => setForm((current) => ({ ...current, replaceCategories: event.target.checked }))} /> جایگزینی دسته‌بندی‌های قبلی با یک دسته و زیردستهٔ جدید</label></div>}
        {(isNew || form.replaceCategories) && <><label className="admin-field"><span>دسته <b>*</b></span><select value={form.category} onChange={(event) => { const category = categories.find((item) => item.id === event.target.value); setForm((current) => ({ ...current, category: category.id, subcategory: category.sub[0].id })) }}>{categories.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}</select></label><label className="admin-field"><span>زیردسته <b>*</b></span><select value={form.subcategory} onChange={update('subcategory')}>{selectedCategory?.sub.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label></>}
        <label className="admin-field admin-field-wide"><span>ویژگی‌ها <b>*</b></span><textarea value={form.features} onChange={update('features')} rows="3" placeholder="هر ویژگی در یک خط؛ حداکثر ۸ ویژگی" required /><small>هر ویژگی را در یک خط بنویسید.</small></label>
        <div className="admin-field admin-field-wide"><span>تصویر کالا</span><div className="admin-image-picker"><img src={preview || assetUrl(form.image)} alt="پیش‌نمایش تصویر کالا" /><div><label className="admin-upload-button"><ImagePlus size={17} /> انتخاب فایل تصویر<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { setFile(event.target.files?.[0] || null); setError('') }} /></label><small>{staticDemo ? 'در محیط تمرینی: PNG، JPEG یا WebP تا ۲۰۰ کیلوبایت، فقط در همین مرورگر.' : 'PNG، JPEG یا WebP تا ۲ مگابایت؛ فایل روی همین سرور ذخیره می‌شود.'}</small>{file && <small className="admin-file-name">{file.name}</small>}</div></div></div>
        <label className="admin-field admin-field-wide"><span>یا مسیر تصویر موجود</span><input dir="ltr" list="admin-image-paths" value={form.image} onChange={update('image')} placeholder="/images/product-phone.jpg" /><datalist id="admin-image-paths">{options.map((image) => <option value={image} key={image} />)}</datalist><small>فقط تصویرهای موجود فروشگاه یا تصاویر بارگذاری‌شده مجازند.</small></label>
        <label className="admin-check admin-field-wide"><input type="checkbox" checked={form.active} onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))} /> {staticDemo ? 'نمایش کالا در کاتالوگ تمرینی' : 'نمایش کالا در کاتالوگ فروشگاه'}</label>
      </div>
      {error && <div className="admin-form-error" role="alert"><AlertTriangle size={16} /> {error}</div>}
      <div className="admin-modal-actions"><button type="button" className="admin-button admin-button-light" onClick={close} disabled={busy}>انصراف</button><button type="submit" className="admin-button admin-button-primary" disabled={busy}><Save size={16} /> {busy ? 'در حال ذخیره…' : 'ذخیره کالا'}</button></div>
    </form>
  </Modal>
}

export function StockDialog({ product, close, onSave, busy, staticDemo }) {
  const [stock, setStock] = useState(String(product.stock))
  const [error, setError] = useState('')
  const submit = async (event) => {
    event.preventDefault()
    const result = await onSave({ ...product, stock }, false, null)
    if (result?.error) setError(result.error)
  }
  return <Modal title="تنظیم موجودی" close={close} locked={busy}>
    <form className="admin-form" onSubmit={submit}><div className="admin-dialog-product"><span><Package size={20} /></span><div><strong>{product.title}</strong><small dir="ltr">{product.id}</small></div></div><label className="admin-field"><span>موجودی جدید (عدد)</span><input inputMode="numeric" value={stock} onChange={(event) => { setStock(event.target.value); setError('') }} required /></label><p className="admin-form-hint">موجودی فعلی: {fa(product.stock)} عدد. {staticDemo ? 'این تغییر فقط در محیط تمرینی همین مرورگر است.' : 'تغییر هم‌زمان موجودی توسط سفارش بررسی می‌شود.'}</p>{error && <div className="admin-form-error" role="alert">{error}</div>}<div className="admin-modal-actions"><button type="button" className="admin-button admin-button-light" onClick={close} disabled={busy}>انصراف</button><button type="submit" className="admin-button admin-button-primary" disabled={busy}>ذخیره موجودی</button></div></form>
  </Modal>
}

export function OrderDialog({ order, close, onUpdate, busy, staticDemo }) {
  const [reviewStatus, setReviewStatus] = useState(order.reviewStatus)
  const [error, setError] = useState('')
  useEffect(() => { setReviewStatus(order.reviewStatus) }, [order.reviewStatus])
  const submit = async (event) => {
    event.preventDefault()
    const result = await onUpdate(order, reviewStatus)
    if (result?.error) setError(result.error); else setError('')
  }
  return <Modal title="جزئیات سفارش آزمایشی" close={close} wide locked={busy}>
    <div className="admin-order-summary"><div><small>شماره سفارش آزمایشی</small><strong dir="ltr">{order.reference}</strong></div><Badge status={order.reviewStatus} /></div>
    <p className="admin-order-warning"><ShieldCheck size={17} /> {staticDemo ? 'این سفارش و مشخصات آن کاملاً ساختگی و فقط برای تمرین هستند.' : 'این سفارش آزمایشی است؛ پرداخت یا ارسال واقعی انجام نشده است.'}</p>
    <div className="admin-detail-grid"><div><small>تاریخ ثبت</small><strong>{dateTime(order.createdAt)}</strong></div><div><small>نام گیرنده نمونه</small><strong>{order.customer.name}</strong></div><div><small>موبایل نمونه</small><strong dir="ltr">{order.customer.phone}</strong></div><div><small>شهر نمونه</small><strong>{order.customer.city}</strong></div><div className="admin-detail-wide"><small>نشانی نمونه</small><strong>{order.customer.address}</strong></div></div>
    <div className="admin-order-lines"><h3>کالاهای سفارش</h3>{order.items.map((item) => <div key={item.id}><span><strong>{item.title}</strong><small>{fa(item.quantity)} عدد × {money(item.unitPrice)}</small></span><b>{money(item.quantity * item.unitPrice)}</b></div>)}<div className="admin-order-total"><span>جمع آزمایشی</span><b>{money(order.total)}</b></div></div>
    <form className="admin-review-form" onSubmit={submit}><label className="admin-field"><span>وضعیت بررسی داخلی</span><select value={reviewStatus} onChange={(event) => { setReviewStatus(event.target.value); setError('') }}>{ORDER_REVIEW_STATES.map((value) => <option key={value} value={value}>{ORDER_REVIEW_LABELS[value]}</option>)}</select><small>این وضعیت به معنی پرداخت، پردازش واقعی یا ارسال کالا نیست.</small></label><button type="submit" className="admin-button admin-button-primary" disabled={busy || reviewStatus === order.reviewStatus}>ذخیره وضعیت</button></form>
    {error && <div className="admin-form-error" role="alert">{error}</div>}
  </Modal>
}

export function ConfirmDialog({ title, message, confirmLabel = 'تأیید', close, onConfirm, busy }) {
  return <Modal title={title} close={close} locked={busy}><div className="admin-confirm"><span><AlertTriangle size={22} /></span><p>{message}</p><div className="admin-modal-actions"><button type="button" className="admin-button admin-button-light" onClick={close} disabled={busy}>انصراف</button><button type="button" className="admin-button admin-button-danger" onClick={onConfirm} disabled={busy}>{confirmLabel}</button></div></div></Modal>
}
