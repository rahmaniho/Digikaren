import React, { useEffect, useState } from 'react'
import { ChevronLeft, Info, SlidersHorizontal } from 'lucide-react'
import { DISCOUNT_LEVELS, parsePrice } from './discovery'

const fa = (number) => new Intl.NumberFormat('fa-IR').format(number)

export function CatalogFilters({ view, categories, go, update, inventoryKnown, close, categoryRef, formId }) {
  const [minDraft, setMinDraft] = useState(view.min == null ? '' : String(view.min))
  const [maxDraft, setMaxDraft] = useState(view.max == null ? '' : String(view.max))
  const [error, setError] = useState('')
  useEffect(() => {
    setMinDraft(view.min == null ? '' : String(view.min))
    setMaxDraft(view.max == null ? '' : String(view.max))
    setError('')
  }, [view.min, view.max])
  const clear = () => {
    setMinDraft(''); setMaxDraft(''); setError('')
    update({ min: undefined, max: undefined, discount: undefined, available: undefined })
  }
  const applyPrice = (event) => {
    event.preventDefault()
    const min = parsePrice(minDraft)
    const max = parsePrice(maxDraft)
    if (Number.isNaN(min) || Number.isNaN(max)) { setError('قیمت را به صورت عدد صحیح و بدون علامت وارد کن.'); return }
    if (min != null && max != null && min > max) { setError('حداقل قیمت نمی‌تواند بیشتر از حداکثر قیمت باشد.'); return }
    setError('')
    update({ min: min ?? undefined, max: max ?? undefined })
    close?.()
  }
  return <>
    <div className="filter-heading"><SlidersHorizontal size={19} /><strong>فیلترها</strong><button type="button" onClick={clear}>حذف فیلترها</button></div>
    <div className="filter-group"><h3>دسته‌بندی کالاها</h3><div className="filter-category-list" ref={categoryRef}>{categories.map((item) => <button type="button" className={view.type === 'category' && view.id === item.id ? 'active' : ''} key={item.id} onClick={() => { close?.(); go({ type: 'category', id: item.id }) }}>{item.label}<ChevronLeft size={14} /></button>)}</div></div>
    <form id={formId} className="price-filter filter-group" onSubmit={applyPrice} noValidate>
      <h3>محدوده قیمت <small>تومان</small></h3>
      <label>از قیمت<input aria-label="حداقل قیمت به تومان" inputMode="numeric" value={minDraft} onChange={(event) => { setMinDraft(event.target.value); setError('') }} placeholder="مثلاً ۱۰۰٬۰۰۰" aria-invalid={Boolean(error)} /></label>
      <label>تا قیمت<input aria-label="حداکثر قیمت به تومان" inputMode="numeric" value={maxDraft} onChange={(event) => { setMaxDraft(event.target.value); setError('') }} placeholder="مثلاً ۵۰۰٬۰۰۰" aria-invalid={Boolean(error)} /></label>
      {error && <p className="price-filter-error" role="alert">{error}</p>}
      <button type="submit" className="price-filter-apply">اعمال قیمت</button>
    </form>
    <label className="discount-filter"><span>میزان تخفیف نمونه</span><select value={view.discount === true ? '1' : String(view.discount || '')} onChange={(event) => update({ discount: event.target.value === '1' ? true : Number(event.target.value) || undefined })}><option value="">همه کالاها</option><option value="1">فقط کالاهای تخفیف‌دار</option>{DISCOUNT_LEVELS.map((level) => <option key={level} value={level}>{fa(level)}٪ و بیشتر</option>)}</select></label>
    {inventoryKnown && <label className="filter-toggle available-toggle"><span>فقط کالاهای موجود آزمایشی</span><input type="checkbox" checked={Boolean(view.available)} onChange={(event) => update({ available: event.target.checked || undefined })} /><i /></label>}
    {!inventoryKnown && view.available && <p className="filter-inventory-note">فیلتر موجودی تا اتصال به موجودی آزمایشی اعمال نمی‌شود.</p>}
    <div className="filter-note"><Info size={21} /><span>قیمت و اطلاعات کالاها<br /><b>نمونه هستند</b></span></div>
  </>
}
