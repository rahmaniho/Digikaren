import React, { useEffect, useRef, useState } from 'react'
import {
  ArrowLeft, BookOpen, BriefcaseBusiness, ChevronDown, ChevronLeft, CreditCard, Headphones,
  HeartHandshake, Info, LockKeyhole, PackageCheck, RotateCcw, Search, ShoppingBag, Truck, X,
} from 'lucide-react'
import { normalizeText } from './discovery'
import { validHelpTopic } from './help-data'

export function HelpPage({ topic, go, staticDemo }) {
  const [query, setQuery] = useState('')
  const topicNavRef = useRef(null)
  useEffect(() => {
    let cancelled = false
    const revealActive = () => {
      const nav = topicNavRef.current
      const active = nav?.querySelector('button.active')
      if (!nav || !active) return
      const bounds = nav.getBoundingClientRect()
      const item = active.getBoundingClientRect()
      if (item.left < bounds.left) nav.scrollBy({ left: item.left - bounds.left - 8 })
      else if (item.right > bounds.right) nav.scrollBy({ left: item.right - bounds.right + 8 })
    }
    revealActive()
    document.fonts?.ready.then(() => { if (!cancelled) revealActive() })
    window.addEventListener('resize', revealActive)
    return () => { cancelled = true; window.removeEventListener('resize', revealActive) }
  }, [topic, query])
  const topics = [
    { id: 'start', label: 'شروع و جست‌وجو', Icon: BookOpen, intro: 'راهنمای مرور کاتالوگ و استفاده از امکانات فروشگاه نمونه.', questions: [
      ['چطور کالایی را پیدا کنم؟', 'از جست‌وجوی بالای صفحه، فهرست دسته‌ها یا فیلترهای قیمت، تخفیف و مرتب‌سازی استفاده کن. فیلترهای انتخاب‌شده در نشانی صفحه باقی می‌مانند.'],
      ['چطور کالاها را مقایسه کنم؟', 'روی نشان مقایسه در کارت یا صفحهٔ کالا بزن؛ می‌توانی تا چهار کالا را کنار هم ببینی و در صورت تمایل پیوند مقایسه را به اشتراک بگذاری.'],
      ['علاقه‌مندی‌ها و بازدیدها کجا هستند؟', 'از نشان قلب یا «فضای من» در سربرگ می‌توانی انتخاب‌ها و بازدیدهای همین مرورگر را ببینی و پاک کنی. این داده‌ها به حساب کاربری متصل نیستند.'],
    ] },
    { id: 'orders', label: 'سفارش آزمایشی', Icon: ShoppingBag, intro: 'این پروژه برای نمایش تجربهٔ خرید ساخته شده است، نه ثبت سفارش واقعی.', questions: [
      ['آیا می‌توانم سفارش ثبت کنم؟', staticDemo ? 'در نسخهٔ گیت‌هاب پیجز سرور سفارش وجود ندارد؛ ثبت سفارش، پرداخت و ارسال فعال نیستند و فرم دریافت مشخصات نمایش داده نمی‌شود.' : 'در نسخهٔ محلی می‌توان با اطلاعات ساختگی یک سفارش آزمایشی ثبت کرد. اطلاعات ساختگی در پایگاه‌دادهٔ همان سرور ذخیره می‌شوند؛ هیچ خرید واقعی، پرداخت یا ارسالی انجام نمی‌شود.'],
      ['رسیدهای آزمایشی چیست؟', 'پس از ثبت موفق در نسخهٔ سروری، در صورت امکان خلاصهٔ رسید بدون نام، شماره موبایل یا نشانی در همین مرورگر ذخیره می‌شود. حداکثر ۲۰ رسید آخر نگه داشته می‌شود؛ این فهرست پیگیری سفارش واقعی نیست و بین دستگاه‌ها همگام نمی‌شود.'],
      ['اگر رسید را پاک کنم چه می‌شود؟', 'فقط کپی موجود در مرورگر پاک می‌شود؛ رکورد ذخیره‌شده در پایگاه‌دادهٔ سرور آزمایشی با این کار حذف نمی‌شود.'],
    ] },
    { id: 'delivery', label: 'ارسال', Icon: Truck, intro: 'ارسال کالا در این نسخه فعال نیست.', questions: [
      ['آیا کالایی برای من ارسال می‌شود؟', 'خیر. هیچ سفارش واقعی، ارسال، هزینهٔ حمل یا تاریخ تحویل در این نمونه وجود ندارد.'],
      ['انتخاب شهر چه کاربردی دارد؟', 'شهر فقط برای نمایش در همین مرورگر ذخیره می‌شود و شرایط یا هزینهٔ ارسال واقعی را محاسبه نمی‌کند.'],
    ] },
    { id: 'payment', label: 'پرداخت', Icon: CreditCard, intro: 'درگاه پرداختی به این فروشگاه نمونه متصل نیست.', questions: [
      ['آیا پولی دریافت می‌شود؟', 'خیر. قیمت‌ها و جمع سبد نمونه‌اند و هیچ درگاه یا روش پرداخت واقعی فعال نیست.'],
      ['خرید اقساطی فعال است؟', 'خیر. خرید اقساطی و سایر روش‌های پرداخت در این نسخه به سرویسی متصل نیستند.'],
    ] },
    { id: 'returns', label: 'بازگشت کالا', Icon: RotateCcw, intro: 'در نسخهٔ نمایشی کالایی فروخته یا ارسال نمی‌شود.', questions: [
      ['چطور کالا را مرجوع کنم؟', 'برای این نسخه فرایند مرجوعی وجود ندارد، چون هیچ کالایی فروخته یا ارسال نمی‌شود.'],
      ['آیا شرایط بازگشت واقعی وجود دارد؟', 'خیر. شرایط بازگشت باید پیش از راه‌اندازی فروشگاه واقعی جداگانه تعریف و بررسی شوند.'],
    ] },
    { id: 'privacy', label: 'داده‌های من', Icon: LockKeyhole, intro: 'اطلاعات محلی را بشناس و هر زمان خواستی بخش‌های دلخواه را پاک کن.', questions: [
      ['چه چیزهایی در مرورگر ذخیره می‌شوند؟', 'سبد خرید، علاقه‌مندی‌ها، مقایسه، بازدیدها، شهر، یادداشت‌های شخصی و خلاصهٔ رسیدهای آزمایشی در حافظهٔ همین مرورگر نگهداری می‌شوند. یادداشت‌ها و رسیدها بین دستگاه‌ها همگام نمی‌شوند.'],
      ['چه چیزی با پیوندها به اشتراک گذاشته می‌شود؟', 'اگر پیوند کالا یا مقایسه را کپی و ارسال کنی، شناسهٔ کالاهای موجود در آن پیوند قابل مشاهده است. یادداشت‌های شخصی و سبد خرید در پیوند قرار نمی‌گیرند.'],
      ['آیا یادداشت‌ها محرمانه‌اند؟', 'یادداشت‌ها در این مرورگر رمزگذاری یا به حساب متصل نیستند و هر کسی به این مرورگر دسترسی داشته باشد می‌تواند آن‌ها را ببیند. رمز عبور و اطلاعات حساس ننویس.'],
      ['چطور اطلاعات مرورگرم را پاک کنم؟', 'در «فضای من» می‌توان گروه‌های داده را جداگانه پاک کرد و شهر را به حالت پیش‌فرض بازگرداند. این دکمه‌ها حافظهٔ آفلاین یا پایگاه‌دادهٔ سرور آزمایشی را حذف نمی‌کنند؛ برای حذف همهٔ داده‌های سایت از تنظیمات مرورگر استفاده کن.'],
      ['آیا اطلاعات فرم به سرور می‌رود؟', staticDemo ? 'در نسخهٔ ایستای گیت‌هاب پیجز فرم سفارش یا ورود نمایش داده نمی‌شود و وب‌اپ درخواستی برای ثبت سفارش به سرور نمی‌فرستد.' : 'در نسخهٔ سروری، فقط هنگام ثبت سفارش آزمایشی اطلاعات ساختگی فرم به سرور همان نسخه ارسال و در پایگاه‌داده ذخیره می‌شود. رسید محلی شامل این مشخصات تماس نیست.'],
    ] },
    { id: 'about', label: 'درباره دیجی‌کارن', Icon: Info, intro: 'دیجی‌کارن یک وب‌اپ فروشگاهی نمونه و راست‌به‌چپ است.', questions: [
      ['آیا اطلاعات کالاها واقعی هستند؟', 'خیر. کالاها، تصاویر، قیمت‌ها، تخفیف‌ها، امتیازها، تعداد دیدگاه و فروش، و موجودی نسخهٔ سروری نمونه‌اند و نباید مبنای خرید واقعی قرار بگیرند.'],
      ['آیا حساب کاربری فعال است؟', 'خیر. «فضای من» اطلاعات محلی همین مرورگر را نمایش می‌دهد و سامانهٔ ورود، ثبت‌نام یا همگام‌سازی حساب کاربری نیست.'],
    ] },
    { id: 'contact', label: 'تماس و پشتیبانی', Icon: Headphones, intro: 'راهنمای خودکار برای آشنایی با امکانات نسخهٔ نمایشی.', questions: [
      ['چطور با پشتیبان تماس بگیرم؟', 'در این نسخه پشتیبان انسانی، شماره تماس یا سرویس پیام‌رسانی متصل نیست. دکمهٔ راهنما فقط پاسخ‌های از پیش نوشته‌شده را نمایش می‌دهد.'],
      ['پاسخ سؤالم را کجا پیدا کنم؟', 'موضوع مورد نظر را از فهرست این صفحه انتخاب کن یا عبارت دلخواه را در جست‌وجوی راهنما بنویس.'],
    ] },
    { id: 'careers', label: 'فرصت‌های شغلی', Icon: BriefcaseBusiness, intro: 'این پروژه در حال حاضر یک نمونهٔ نمایشی است.', questions: [
      ['آیا امکان درخواست همکاری وجود دارد؟', 'در این نسخه فرایند استخدام یا فرم دریافت اطلاعات متقاضی فعال نیست.'],
    ] },
  ]
  const current = topics.find((item) => item.id === validHelpTopic(topic)) || topics[0]
  const normalizedQuery = normalizeText(query)
  const searchResults = normalizedQuery ? topics.flatMap((item) => item.questions
    .filter(([question, answer]) => normalizeText(`${item.label} ${question} ${answer}`).includes(normalizedQuery))
    .map(([question, answer]) => ({ section: item.label, question, answer }))) : []
  return <main className="container-wide help-page">
    <nav className="breadcrumbs" aria-label="مسیر راهنما"><button type="button" onClick={() => go({ type: 'home' })}>دیجی‌کارن</button><ChevronLeft size={14} /><span>مرکز راهنما</span></nav>
    <section className="help-hero"><div><span className="personal-eyebrow"><HeartHandshake size={15} /> اینجا برای کمک به انتخاب تو</span><h1>چطور می‌توانیم کمک کنیم؟</h1><p>پاسخ‌های روشن درباره امکانات و محدودیت‌های نسخهٔ نمایشی دیجی‌کارن.</p></div><div className="help-search" role="search"><Search size={19} /><input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="جست‌وجو در راهنما" placeholder="موضوع یا سؤال خود را جست‌وجو کن" />{query && <button type="button" aria-label="پاک کردن جست‌وجوی راهنما" onClick={() => setQuery('')}><X size={17} /></button>}</div></section>
    <div className="help-layout"><nav className="help-topics" ref={topicNavRef} aria-label="موضوعات راهنما"><strong>موضوعات راهنما</strong>{topics.map(({ id, label, Icon }) => <button type="button" key={id} className={current.id === id && !normalizedQuery ? 'active' : ''} aria-current={current.id === id && !normalizedQuery ? 'page' : undefined} onClick={() => { setQuery(''); go({ type: 'help', topic: id }) }}><Icon size={17} /><span>{label}</span><ChevronLeft size={14} /></button>)}</nav>
      <section className="help-content" aria-live="polite">
        {normalizedQuery ? <><span className="heading-eyebrow">جست‌وجو در پرسش‌ها</span><h2>نتایج برای «{query}»</h2><p>{searchResults.length ? `${new Intl.NumberFormat('fa-IR').format(searchResults.length)} پاسخ پیدا شد.` : 'پاسخی پیدا نشد؛ عبارت کوتاه‌تر یا موضوع دیگری را امتحان کن.'}</p><div className="help-questions">{searchResults.map(({ section, question, answer }) => <details key={`${section}-${question}`}><summary><span><small>{section}</small>{question}</span><ChevronDown size={17} /></summary><p>{answer}</p></details>)}</div></> : <><span className="heading-eyebrow">مرکز راهنمای دیجی‌کارن</span><h2>{current.label}</h2><p>{current.intro}</p><div className="help-questions">{current.questions.map(([question, answer]) => <details key={question}><summary><span>{question}</span><ChevronDown size={17} /></summary><p>{answer}</p></details>)}</div></>}
        <div className="help-next"><span><PackageCheck size={20} /></span><div><strong>انتخاب‌هایت را یک‌جا ببین</strong><p>سبد، علاقه‌مندی‌ها و داده‌های محلی در فضای من در دسترس‌اند.</p></div><button type="button" onClick={() => go({ type: 'workspace' })}>رفتن به فضای من <ArrowLeft size={15} /></button></div>
      </section>
    </div>
  </main>
}
