import React, { useEffect, useRef } from 'react'
import { ArrowDownToLine, ChevronDown, X } from 'lucide-react'
import { ORDER_REVIEW_LABELS } from './shared'

export const fa = (value) => new Intl.NumberFormat('fa-IR').format(value || 0)
export const money = (value) => `${fa(value)} تومان`
export const dateTime = (value, options = { dateStyle: 'medium', timeStyle: 'short' }) => {
  try { return new Intl.DateTimeFormat('fa-IR', options).format(new Date(value)) } catch { return '—' }
}
export const shortDate = (value) => dateTime(value, { month: 'short', day: 'numeric' })

export function Badge({ status }) {
  return <span className={`admin-badge admin-status-${status}`}>{ORDER_REVIEW_LABELS[status] || 'نامشخص'}</span>
}

export function CardHeading({ eyebrow, title, description, action }) {
  return <div className="admin-card-heading"><div>{eyebrow && <span className="admin-eyebrow">{eyebrow}</span>}<h2>{title}</h2>{description && <p>{description}</p>}</div>{action}</div>
}

export function ExportButton({ onClick, children = 'خروجی CSV' }) {
  return <button type="button" className="admin-button admin-button-light" onClick={onClick}><ArrowDownToLine size={16} /> {children}</button>
}

export function Empty({ title, text, children }) {
  return <div className="admin-empty"><span>✦</span><strong>{title}</strong>{text && <p>{text}</p>}{children}</div>
}

export function Select({ value, onChange, label, children }) {
  return <label className="admin-select-wrap"><span className="admin-sr-only">{label}</span><select value={value} onChange={onChange} aria-label={label}>{children}</select><ChevronDown size={15} aria-hidden="true" /></label>
}

export function Modal({ title, close, children, wide = false, locked = false }) {
  const panel = useRef(null)
  const state = useRef({ close, locked })
  state.current = { close, locked }
  useEffect(() => {
    const previous = document.activeElement
    const element = panel.current
    const focusables = () => [...element.querySelectorAll('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href]')].filter((node) => node.getClientRects().length)
    element.focus()
    const keydown = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); if (!state.current.locked) state.current.close(); return }
      if (event.key !== 'Tab') return
      const items = focusables()
      if (!items.length) { event.preventDefault(); element.focus(); return }
      const first = items[0], last = items[items.length - 1]
      if (!element.contains(document.activeElement)) { event.preventDefault(); first.focus(); return }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === element)) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', keydown)
    document.body.classList.add('admin-modal-open')
    return () => { document.removeEventListener('keydown', keydown); document.body.classList.remove('admin-modal-open'); if (previous?.isConnected) previous.focus() }
  }, [])
  return <div className="admin-modal-backdrop" onMouseDown={(event) => { if (!locked && event.target === event.currentTarget) close() }}><section ref={panel} tabIndex="-1" className={`admin-modal${wide ? ' admin-modal-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
    <div className="admin-modal-heading"><div><span className="admin-eyebrow">پنل مدیریت دیجی‌کارن</span><h2>{title}</h2></div><button type="button" className="admin-icon-button" aria-label="بستن" onClick={close} disabled={locked}><X size={19} /></button></div>
    {children}
  </section></div>
}

// Range charts are based on the currently loaded order summaries. They never
// claim payment or completed sales; all values are demo order totals.
export function Chart({ orders, days }) {
  const count = days === 7 ? 7 : days === 30 ? 10 : 9
  const width = 660, height = 215, left = 8, right = 10, top = 20, bottom = 30
  const stepDays = days / count
  const now = Date.now()
  const values = Array.from({ length: count }, (_, index) => {
    const start = now - (count - index) * stepDays * 86400000
    const end = now - (count - index - 1) * stepDays * 86400000
    return { start, end, total: orders.filter((order) => { const time = Date.parse(order.createdAt); return time >= start && time < end }).reduce((sum, order) => sum + order.total, 0) }
  })
  const max = Math.max(1, ...values.map((item) => item.total))
  const x = (index) => left + (width - left - right) * index / Math.max(1, count - 1)
  const y = (value) => top + (height - top - bottom) * (1 - value / max)
  const points = values.map((item, index) => `${x(index)},${y(item.total)}`).join(' ')
  const area = `${left},${height - bottom} ${points} ${width - right},${height - bottom}`
  return <div className="admin-chart" role="img" aria-label={`نمودار مجموع سفارش‌های آزمایشی در ${fa(days)} روز گذشته`}>
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
      <defs><linearGradient id="admin-chart-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#3d80ff" stopOpacity=".24" /><stop offset="100%" stopColor="#3d80ff" stopOpacity="0" /></linearGradient></defs>
      {[0, 1, 2, 3].map((line) => <line key={line} x1={left} x2={width - right} y1={top + line * (height - top - bottom) / 3} y2={top + line * (height - top - bottom) / 3} stroke="#eaf0f7" strokeDasharray="4 5" />)}
      <polygon points={area} fill="url(#admin-chart-fill)" /><polyline points={points} fill="none" stroke="#397cf5" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      {values.map((item, index) => <circle key={index} cx={x(index)} cy={y(item.total)} r="3.8" fill="#fff" stroke="#397cf5" strokeWidth="2" vectorEffect="non-scaling-stroke" />)}
    </svg>
    <div className="admin-chart-labels" dir="ltr">{values.filter((_, index) => index % (count > 7 ? 2 : 1) === 0 || index === count - 1).map((item, index) => <span key={index}>{shortDate(item.end)}</span>)}</div>
  </div>
}
