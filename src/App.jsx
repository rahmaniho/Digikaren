import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft, ArrowRight, ArrowUp, BadgePercent, Baby, BedDouble, BookOpen, BriefcaseBusiness,
  Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, CookingPot,
  CreditCard, Download, Dumbbell, Eye, Flame, Flower2, Gamepad2, Gift, Grid2X2, Headphones, Heart, HeartPulse, Info,
  Home, LampDesk, Laptop, MapPin, Minus, Monitor, Music2, Palette, PartyPopper, PawPrint, Plus, Search, ShieldCheck, Shirt, SprayCan,
  ShoppingBag, ShoppingBasket, ShoppingCart, SlidersHorizontal, Smartphone,
  Share2, Sparkles, Star, Store, Trash2, Truck, UserRound, Watch, X, Zap, ZoomIn,
} from 'lucide-react'
import { categories, products as sampleProducts, slides } from './data'
import { clearCheckoutKey, keyForCheckout } from './checkout'
import { followProductLink, viewFromSearch, viewUrl } from './navigation'
import { relatedProducts } from './recommendations'
import { productQuantityLimit, quantityAvailableToAdd } from './cart-limits'
import { assetUrl } from './assets'

const STATIC_DEMO = import.meta.env.MODE === 'pages'
const fa = (number) => new Intl.NumberFormat('fa-IR').format(number)
const CatalogContext = createContext(sampleProducts)
const iconMap = {
  mobile: Smartphone, digital: Laptop, home: Home, fashion: Shirt, beauty: HeartPulse,
  grocery: ShoppingBasket, watch: Watch, gaming: Gamepad2, sports: Dumbbell,
  kids: Baby, books: BookOpen, vehicle: Store, gifts: Gift, computer: Monitor,
  pets: PawPrint, garden: Flower2, music: Music2, handmade: Palette,
  'bed-bath': BedDouble, lighting: LampDesk, office: BriefcaseBusiness, party: PartyPopper, cleaning: SprayCan,
}
const newCategoryIds = ['bed-bath', 'lighting', 'office', 'party', 'cleaning', 'computer', 'pets', 'garden', 'music', 'handmade']

function normalize(value = '') {
  const digits = '۰۱۲۳۴۵۶۷۸۹'
  const arabicDigits = '٠١٢٣٤٥٦٧٨٩'
  return String(value).toLowerCase().replace(/[۰-۹٠-٩]/g, (char) => {
    const i = digits.indexOf(char)
    return String(i >= 0 ? i : arabicDigits.indexOf(char))
  }).replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/[‌\s]+/g, ' ').trim()
}

function searchableProduct(product) {
  const labels = product.categories.flatMap((id) => {
    const category = categories.find((item) => item.id === id)
    const ids = product.subcategories?.[id] || []
    return [category?.label || '', ...(category?.sub.filter((item) => ids.includes(item.id)).map((item) => item.label) || [])]
  })
  return normalize([product.title, ...(product.features || []), ...labels].join(' '))
}

const readView = () => viewFromSearch(window.location.search)

function useStoredState(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key)
      return stored ? JSON.parse(stored) : initialValue
    } catch {
      return initialValue
    }
  })
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* Browsing still works without storage. */ }
  }, [key, value])
  return [value, setValue]
}

function Logo({ onClick }) {
  return (
    <button type="button" className="logo" onClick={onClick} aria-label="دیجی‌کارن، صفحه اصلی">
      <img src={assetUrl('/digikaren-logo.png')} alt="" width="200" height="52" />
    </button>
  )
}

function Header({ view, go, cartCount, favorites, city, openModal, onSupport }) {
  const products = useContext(CatalogContext)
  const [searchValue, setSearchValue] = useState(view.type === 'search' ? view.query : '')
  const [searchOpen, setSearchOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState(categories[0].id)
  const searchRef = useRef(null)
  const menuRef = useRef(null)
  useEffect(() => {
    if (view.type === 'search') setSearchValue(view.query)
  }, [view])
  useEffect(() => {
    function handlePointer(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) setSearchOpen(false)
      if (menuRef.current && !menuRef.current.contains(event.target)) setMenuOpen(false)
    }
    document.addEventListener('pointerdown', handlePointer)
    return () => document.removeEventListener('pointerdown', handlePointer)
  }, [])
  const matches = products.filter((product) => searchableProduct(product).includes(normalize(searchValue))).slice(0, 4)
  const searchFor = (value) => {
    const query = value.trim()
    if (!query) return
    setSearchValue(query)
    setSearchOpen(false)
    go({ type: 'search', query })
  }
  const selectedCategory = categories.find((item) => item.id === activeCategory) || categories[0]
  const canHover = () => window.innerWidth > 700 && window.matchMedia('(hover: hover) and (pointer: fine)').matches

  return <header className="site-header">
    <div className="header-main container-wide">
      <Logo onClick={() => go({ type: 'home' })} />
      <div className={`search-area ${searchOpen ? 'is-open' : ''}`} ref={searchRef}>
        <form className="search-box" onSubmit={(event) => { event.preventDefault(); searchFor(searchValue) }} role="search">
          <Search size={20} strokeWidth={1.8} aria-hidden="true" />
          <input dir="rtl" value={searchValue} onChange={(event) => { setSearchValue(event.target.value); setSearchOpen(true) }} onFocus={() => setSearchOpen(true)} onKeyDown={(event) => { if (event.key === 'Escape') setSearchOpen(false) }} placeholder="جستجو در میان کالاها..." aria-label="جستجو در دیجی‌کارن" />
          {searchValue && <button type="button" className="search-clear" aria-label="پاک کردن جستجو" onClick={() => setSearchValue('')}><X size={17} /></button>}
        </form>
        {searchOpen && <div className="search-popover" dir="rtl">
          {searchValue.trim() ? <>
            <p className="popover-label">نتایج پیشنهادی</p>
            {matches.length ? matches.map((product) => <a className="suggestion" href={viewUrl({ type: 'product', id: product.id })} key={product.id} onClick={(event) => followProductLink(event, product.id, (next) => { setSearchOpen(false); go(next) })}>
              <img src={assetUrl(product.image)} alt="" /><span>{product.title}</span><ChevronLeft size={16} />
            </a>) : <p className="suggestion-empty">کالایی پیدا نشد؛ عبارت دیگری را امتحان کنید.</p>}
            <button type="button" className="search-all" onClick={() => searchFor(searchValue)}>مشاهده همه نتایج برای «{searchValue}» <ArrowLeft size={15} /></button>
          </> : <>
            <p className="popover-label"><Flame size={17} /> جستجوهای پرطرفدار</p>
            <div className="search-tags">{['گوشی موبایل', 'هدفون', 'ساعت هوشمند', 'اسپرسوساز'].map((term) => <button type="button" key={term} onClick={() => searchFor(term)}>{term}<ChevronLeft size={14} /></button>)}</div>
          </>}
        </div>}
      </div>
      <nav className="primary-nav" aria-label="منوی اصلی" dir="rtl">
        <button type="button" className={`primary-nav-link ${view.type === 'home' ? 'active' : ''}`} onClick={() => go({ type: 'home' })}>خانه</button>
        <div className="category-nav" ref={menuRef} onMouseEnter={() => { if (canHover()) setMenuOpen(true) }} onMouseLeave={() => { if (canHover()) setMenuOpen(false) }}>
          <button type="button" className={`category-trigger ${menuOpen || view.type === 'category' || view.type === 'categories' ? 'active' : ''}`} onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen}>دسته‌بندی‌ها <ChevronDown size={14} /></button>
          {menuOpen && <div className="mega-menu">
            <div className="mega-categories">
              <button type="button" className="mega-directory" onClick={() => { setMenuOpen(false); go({ type: 'categories' }) }}><Grid2X2 size={17} />همه دسته‌بندی‌ها<ChevronLeft size={15} /></button>
              {categories.map((category) => {
                const Icon = iconMap[category.id] || Grid2X2
                return <button type="button" key={category.id} className={category.id === activeCategory ? 'selected' : ''} aria-pressed={category.id === activeCategory} onMouseEnter={() => { if (canHover()) setActiveCategory(category.id) }} onFocus={() => setActiveCategory(category.id)} onClick={() => { if (canHover()) { setMenuOpen(false); go({ type: 'category', id: category.id }) } else setActiveCategory(category.id) }}><Icon size={17} />{category.label}<ChevronLeft size={15} /></button>
              })}
            </div>
            <div className="mega-details">
              <button type="button" className="mega-all" onClick={() => { setMenuOpen(false); go({ type: 'category', id: selectedCategory.id }) }}>همه محصولات {selectedCategory.label} <ChevronLeft size={16} /></button>
              <div className="mega-detail-grid">{selectedCategory.sub.map((item) => <button type="button" key={item.id} onClick={() => { setMenuOpen(false); go({ type: 'category', id: selectedCategory.id, sub: item.id }) }}><span />{item.label}<ChevronLeft size={14} /></button>)}</div>
              <div className="mega-note"><Sparkles size={19} /> دنیایی از انتخاب‌های خوب، فقط برای تو</div>
            </div>
          </div>}
        </div>
        <button type="button" className={`primary-nav-link ${view.type === 'deals' ? 'active' : ''}`} onClick={() => go({ type: 'deals' })}>تخفیف‌ها</button>
        <button type="button" className="primary-nav-link nav-contact" onClick={onSupport}>تماس با ما</button>
      </nav>
      <div className="header-actions">
        <button type="button" className="location-button" onClick={() => openModal('location')} aria-label={`انتخاب شهر، ارسال به ${city}`}><MapPin size={17} /><span>{city}</span></button>
        <button type="button" className="icon-button login-button" onClick={() => openModal('login')} aria-label="ورود یا ثبت‌نام"><UserRound size={22} /></button>
        <button type="button" className="icon-button header-favorites" aria-label={`علاقه‌مندی‌ها، ${fa(favorites.length)} کالا`} onClick={() => go({ type: 'favorites' })}><Heart size={21} />{favorites.length > 0 && <span className="counter">{fa(favorites.length)}</span>}</button>
        <button type="button" className="icon-button cart-button" aria-label={`سبد خرید، ${fa(cartCount)} کالا`} onClick={() => openModal('cart')}><ShoppingCart size={23} />{cartCount > 0 && <span className="counter">{fa(cartCount)}</span>}</button>
      </div>
    </div>
  </header>
}

function AppNotice({ openInstall }) {
  return <div className="app-notice" role="note">
    <div className="container-wide app-notice-inner">
      <div><Info size={17} aria-hidden="true" /><span>{STATIC_DEMO ? 'نسخه نمایشی گیت‌هاب پیجز؛ قیمت‌ها نمونه‌اند و ثبت سفارش، پرداخت و ارسال فعال نیست.' : 'وب‌اپ نمایشی دیجی‌کارن؛ پرداخت و ارسال واقعی فعال نیست.'}</span></div>
      <button type="button" onClick={openInstall}><Download size={16} /> نصب وب‌اپ</button>
    </div>
  </div>
}

function Hero({ go }) {
  const [slideIndex, setSlideIndex] = useState(0)
  const slide = slides[slideIndex]
  const next = () => setSlideIndex((current) => (current + 1) % slides.length)
  const previous = () => setSlideIndex((current) => (current - 1 + slides.length) % slides.length)
  const visitSlide = () => go(slide.target === 'all' ? { type: 'all' } : slide.target === 'deals' ? { type: 'deals' } : { type: 'category', id: slide.target })
  const benefits = [
    { Icon: ShoppingBasket, title: 'کالاهای نمونه', description: 'برای آشنایی با فروشگاه' },
    { Icon: ShieldCheck, title: STATIC_DEMO ? 'قیمت نمایشی' : 'سفارش آزمایشی', description: 'بدون پرداخت واقعی' },
    { Icon: Smartphone, title: 'وب‌اپ قابل نصب', description: 'همراه همیشگی' },
    { Icon: Heart, title: 'انتخاب‌های من', description: 'ذخیره در مرورگر' },
  ]
  return <section className={`hero hero-${slide.theme}`} aria-label="پیشنهادهای ویژه دیجی‌کارن">
    <div className="hero-image" style={{ backgroundImage: slide.theme === 'reference' ? `url(${assetUrl(slide.image)})` : `linear-gradient(to right, transparent 48%, var(--hero-bg) 97%), url(${assetUrl(slide.image)})` }} />
    <div className="hero-copy" key={slideIndex}>
      <span className="hero-eyebrow">{slide.theme !== 'reference' && <Sparkles size={15} />} {slide.eyebrow}</span>
      <h1>{slide.title}<br /><span>{slide.title2}</span></h1>
      <p>{slide.description}</p>
      <div className="hero-actions"><button type="button" onClick={visitSlide}>{slide.theme === 'reference' && <ShoppingCart size={18} />}{slide.cta}<ArrowLeft size={18} /></button>{slide.note && <span>{slide.note}</span>}</div>
      {slide.theme === 'reference' && <div className="hero-benefits">{benefits.map(({ Icon, title, description }) => <div key={title}><span><Icon size={20} strokeWidth={1.7} /></span><strong>{title}</strong><small>{description}</small></div>)}</div>}
    </div>
    <div className="hero-controls"><button type="button" aria-label="بنر قبلی" onClick={previous}><ChevronRight size={18} /></button><button type="button" aria-label="بنر بعدی" onClick={next}><ChevronLeft size={18} /></button></div>
    <div className="hero-dots" aria-label="انتخاب بنر">{slides.map((item, index) => <button type="button" key={item.theme} className={index === slideIndex ? 'active' : ''} onClick={() => setSlideIndex(index)} aria-label={`نمایش بنر ${fa(index + 1)}`} aria-current={index === slideIndex ? 'true' : undefined} />)}</div>
    <span className="hero-index" aria-hidden="true">{String(slideIndex + 1).padStart(2, '0')} <i /> {String(slides.length).padStart(2, '0')}</span>
  </section>
}

function QuickLinks({ go, onNotice }) {
  const items = [
    { label: 'شگفت‌انگیزها', Icon: BadgePercent, tone: 'featured', action: () => go({ type: 'deals' }) },
    { label: 'سوپرمارکت', Icon: ShoppingBasket, tone: 'green', action: () => go({ type: 'category', id: 'grocery' }) },
    { label: 'موبایل', Icon: Smartphone, tone: 'blue', action: () => go({ type: 'category', id: 'mobile' }) },
    { label: 'خرید اقساطی', Icon: CreditCard, tone: 'purple', action: onNotice },
    { label: 'مد و پوشاک', Icon: Shirt, tone: 'orange', action: () => go({ type: 'category', id: 'fashion' }) },
    { label: 'خانه و آشپزخانه', Icon: CookingPot, tone: 'teal', action: () => go({ type: 'category', id: 'home' }) },
    { label: 'زیبایی و سلامت', Icon: HeartPulse, tone: 'pink', action: () => go({ type: 'category', id: 'beauty' }) },
    { label: 'همه دسته‌ها', Icon: Grid2X2, tone: 'gray', action: () => go({ type: 'categories' }) },
  ]
  return <section className="quick-links" aria-label="دسترسی سریع">{items.map(({ label, Icon, tone, action }) => <button type="button" key={label} className="quick-link" onClick={action}><span className={`quick-icon ${tone}`}><Icon size={27} strokeWidth={1.65} /><i /></span><span>{label}</span></button>)}</section>
}

function Countdown() {
  const [seconds, setSeconds] = useState(5 * 3600 + 42 * 60 + 36)
  useEffect(() => {
    const timer = window.setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [])
  const parts = [Math.floor(seconds / 3600), Math.floor((seconds % 3600) / 60), seconds % 60]
  return <div className="countdown" dir="ltr" aria-label="زمان باقی‌مانده پیشنهادها">{parts.map((part, index) => <React.Fragment key={index}><span>{fa(part).padStart(2, '۰')}</span>{index < 2 && <b>:</b>}</React.Fragment>)}</div>
}

function Price({ product }) {
  return <div className="price-box"><div className="price-row"><span className="discount-pill">{fa(product.discount)}٪</span><span className="current-price"><b>{fa(product.price)}</b><small>تومان</small></span></div><div className="old-price">{fa(product.oldPrice)}</div></div>
}

function ProductCard({ product, isFavorite, onFavorite, onAdd, onOpen, go, deal = false }) {
  const soldOut = product.stock === 0
  return <article className={`product-card ${deal ? 'deal-product' : ''}`} aria-label={`مشاهده ${product.title}`}>
    <a className="product-card-link" href={viewUrl({ type: 'product', id: product.id })} aria-label={`صفحه کالا: ${product.title}`} onClick={(event) => followProductLink(event, product.id, go)} />
    <div className="product-card-top"><span><Zap size={13} fill="currentColor" /> {product.badge === 'ارسال سریع' ? 'کالای نمونه' : product.badge}</span><div className="product-card-actions">
      <button type="button" className="quick-view-button" aria-label={`نمایش سریع: ${product.title}`} title="نمایش سریع" onClick={() => onOpen(product)}><Eye size={17} /></button>
      <button type="button" className={`favorite-button ${isFavorite ? 'is-favorite' : ''}`} aria-label={`${isFavorite ? 'حذف از' : 'افزودن به'} علاقه‌مندی‌ها: ${product.title}`} onClick={() => onFavorite(product.id)}><Heart size={18} fill={isFavorite ? 'currentColor' : 'none'} /></button>
    </div></div>
    <div className="product-image"><img src={assetUrl(product.image)} alt={product.title} loading="lazy" /><button type="button" className="add-mini" disabled={soldOut} aria-label={`${soldOut ? 'ناموجود' : 'افزودن به سبد خرید'}: ${product.title}`} onClick={() => onAdd(product.id)}><Plus size={17} /></button></div>
    <h3>{product.title}</h3>
    <div className="product-meta"><span>{soldOut ? 'ناموجود' : <><Truck size={13} /> کالای نمونه</>}</span><span className="rating">{product.rating}<Star size={13} fill="currentColor" /></span></div>
    <Price product={product} />
    {deal && <div className="stock-row"><div className="stock-line"><span style={{ width: `${product.sold}%` }} /></div><small><b>{fa(product.sold)}٪</b> فروش رفته</small></div>}
  </article>
}

function Deals({ favorites, onFavorite, onAdd, onOpen, go }) {
  const products = useContext(CatalogContext)
  const slider = useRef(null)
  const [canGoBack, setCanGoBack] = useState(false)
  return <section className="deals-panel" id="deals" aria-label="پیشنهادهای شگفت‌انگیز">
    <div className="deals-intro">
      <span className="deals-overline"><Sparkles size={14} /> فقط برای تو</span>
      <h2>پیشنهادهای<br /><strong>شگفت‌انگیز</strong></h2>
      <div className="deals-illustration" aria-hidden="true"><span>٪</span><i className="spark-one">✦</i><i className="spark-two">✦</i></div>
      <div className="deals-timer-label">فرصت باقی‌مانده</div><Countdown />
      <button type="button" className="deals-all" onClick={() => go({ type: 'deals' })}>مشاهده همه <ChevronLeft size={17} /></button>
    </div>
    <div className="deals-scroll-wrap"><div className="deals-slider" ref={slider} onScroll={(event) => setCanGoBack(event.currentTarget.scrollLeft < -1)}>{products.slice(0, 9).map((product) => <ProductCard key={product.id} product={product} deal isFavorite={favorites.includes(product.id)} onFavorite={onFavorite} onAdd={onAdd} onOpen={onOpen} go={go} />)}</div>{canGoBack && <button type="button" className="slider-prev" aria-label="کالاهای قبلی" onClick={() => slider.current?.scrollBy({ left: 420, behavior: 'smooth' })}><ChevronRight size={19} /></button>}<button type="button" className="slider-next" aria-label="کالاهای بعدی" onClick={() => slider.current?.scrollBy({ left: -420, behavior: 'smooth' })}><ChevronLeft size={19} /></button></div>
  </section>
}

function SupermarketBanner({ go }) {
  const products = useContext(CatalogContext)
  const groceryProducts = ['honey', 'pasta', 'baby'].map((id) => products.find((product) => product.id === id)).filter(Boolean)
  return <section className="supermarket-banner">
    <div className="supermarket-title"><span className="supermarket-icon"><ShoppingBasket size={34} strokeWidth={1.6} /></span><div><div className="supermarket-eyebrow">تازه، خوش‌قیمت، دوست‌داشتنی</div><h2>سوپرمارکت <span>دیجی‌کارن</span></h2></div><span className="super-badge">تا ۲۳٪ تخفیف</span></div>
    <div className="supermarket-items" aria-hidden="true">{groceryProducts.map((product) => <span key={product.id}><img src={assetUrl(product.image)} alt="" /><i>{fa(product.discount)}٪</i></span>)}</div>
    <button type="button" onClick={() => go({ type: 'category', id: 'grocery' })}>مشاهده کالاها <ArrowLeft size={17} /></button>
  </section>
}

function CategorySection({ go }) {
  return <section className="category-section section-space" id="categories">
    <div className="section-heading centered"><div><span className="heading-eyebrow">یه دنیا انتخاب، یه جای مطمئن</span><h2>خرید بر اساس دسته‌بندی</h2><p>هر چیزی که دنبالش هستی، اینجاست</p></div></div>
    <div className="category-grid">{categories.slice(0, 8).map((category) => <button type="button" className="category-tile" key={category.id} onClick={() => go({ type: 'category', id: category.id })}><span className="category-picture" style={{ background: category.color }}><img src={assetUrl(category.image)} alt="" loading="lazy" /></span><strong>{category.label}</strong><span className="category-more">مشاهده کالاها <ChevronLeft size={13} /></span></button>)}</div>
    <div className="category-new-bar" aria-label="دسته‌های تازه فروشگاه">
      <div className="category-new-title"><span>تازه اضافه شده</span><strong>دسته‌های جدید رو کشف کن</strong></div>
      <div className="category-new-links">{newCategoryIds.map((id) => {
        const category = categories.find((item) => item.id === id)
        const Icon = iconMap[id]
        return category && <button type="button" key={id} onClick={() => go({ type: 'category', id })}><Icon size={17} /><span>{category.label}</span><ChevronLeft size={14} /></button>
      })}</div>
    </div>
    <div className="category-explore"><button type="button" onClick={() => go({ type: 'categories' })}>مشاهده همه دسته‌بندی‌ها <ArrowLeft size={16} /></button></div>
  </section>
}

function PromoCards({ go }) {
  return <section className="promo-grid" aria-label="پیشنهادهای ویژه دسته‌بندی">
    <button type="button" className="promo-card promo-tech" onClick={() => go({ type: 'category', id: 'digital' })}>
      <span className="promo-art" /><span className="promo-copy"><small>دنیای دیجیتال</small><strong>به‌روز باش،<br />هوشمند انتخاب کن</strong><span>مشاهده محصولات <ArrowLeft size={16} /></span></span>
    </button>
    <button type="button" className="promo-card promo-beauty" onClick={() => go({ type: 'category', id: 'beauty' })}>
      <span className="promo-art" /><span className="promo-copy"><small>زیبایی و مراقبت</small><strong>یه قرار قشنگ<br />با خودت</strong><span>مشاهده محصولات <ArrowLeft size={16} /></span></span>
    </button>
  </section>
}

function BestSelling({ favorites, onFavorite, onAdd, onOpen, go }) {
  const products = useContext(CatalogContext)
  const selected = ['samsung', 'console', 'sneaker', 'coffee', 'honey', 'fryer'].map((id) => products.find((product) => product.id === id)).filter(Boolean)
  return <section className="best-section section-space">
    <div className="section-heading inline"><div><span className="heading-eyebrow">انتخاب بقیه، خیال راحت تو</span><h2><Flame size={23} /> پرفروش‌ترین‌های دیجی‌کارن</h2></div><button type="button" className="section-link" onClick={() => go({ type: 'all', sort: 'popular' })}>مشاهده همه <ChevronLeft size={17} /></button></div>
    <div className="best-grid">{selected.map((product) => <ProductCard key={product.id} product={product} isFavorite={favorites.includes(product.id)} onFavorite={onFavorite} onAdd={onAdd} onOpen={onOpen} go={go} />)}</div>
  </section>
}

function Discover({ go }) {
  const products = useContext(CatalogContext)
  const groups = [
    { title: 'برای دنیای دیجیتال تو', sub: 'از گوشی تا لوازم جانبی', ids: ['phone-pro', 'headphone', 'earbuds', 'watch'], category: 'digital' },
    { title: 'برای خانه دوست‌داشتنی', sub: 'انتخاب‌هایی برای زندگی بهتر', ids: ['coffee', 'fryer', 'honey', 'cream'], category: 'home' },
    { title: 'برای استایل هر روزت', sub: 'خودت باش، خوش‌استایل باش', ids: ['sneaker', 'watch', 'headphone', 'earbuds'], category: 'fashion' },
    { title: 'برای حال خوب خودت', sub: 'لحظه‌ای برای مراقبت از خود', ids: ['cream', 'honey', 'watch', 'sneaker'], category: 'beauty' },
  ]
  return <section className="discover section-space"><div className="section-heading inline"><div><span className="heading-eyebrow">پیشنهادهای ما برای شما</span><h2>کشف کن و دوست داشته باش</h2></div></div><div className="discover-grid">{groups.map((group) => <div className="discover-card" key={group.title}><h3>{group.title}</h3><p>{group.sub}</p><div className="discover-images">{group.ids.map((id) => { const product = products.find((item) => item.id === id); return product && <a key={id} href={viewUrl({ type: 'product', id })} aria-label={`صفحه کالا: ${product.title}`} onClick={(event) => followProductLink(event, id, go)}><img src={assetUrl(product.image)} alt="" loading="lazy" /></a> })}</div><button type="button" className="section-link" onClick={() => go({ type: 'category', id: group.category })}>مشاهده <ChevronLeft size={15} /></button></div>)}</div></section>
}

function CategoryDirectory({ go }) {
  const products = useContext(CatalogContext)
  const [query, setQuery] = useState('')
  const normalizedQuery = normalize(query)
  const visibleCategories = categories.filter((category) => normalize([category.label, ...category.sub.map((item) => item.label)].join(' ')).includes(normalizedQuery))
  return <main className="container-wide category-directory">
    <div className="breadcrumbs"><button type="button" onClick={() => go({ type: 'home' })}>دیجی‌کارن</button><ChevronLeft size={14} /><span>همه دسته‌بندی‌ها</span></div>
    <div className="directory-intro">
      <div><span className="heading-eyebrow">دنیایی از انتخاب‌های خوب</span><h1>دسته‌بندی‌های دیجی‌کارن</h1><p>از کالاهای دیجیتال تا خانه، زیبایی و سفر؛ دسته مورد علاقه‌ات را انتخاب کن.</p></div>
      <div className="directory-stats"><div><strong>{fa(categories.length)}</strong><span>دسته اصلی</span></div><div><strong>{fa(products.length)}</strong><span>کالای نمونه</span></div></div>
    </div>
    <div className="directory-tools">
      <div className="directory-search" role="search"><Search size={18} /><input aria-label="جست‌وجوی دسته‌بندی‌ها" placeholder="جست‌وجو در دسته‌ها و زیردسته‌ها" value={query} onChange={(event) => setQuery(event.target.value)} />{query && <button type="button" aria-label="پاک کردن جست‌وجوی دسته‌ها" onClick={() => setQuery('')}><X size={16} /></button>}</div>
      <span aria-live="polite">{fa(visibleCategories.length)} دسته نمایش داده می‌شود</span>
    </div>
    {visibleCategories.length === 0 && <div className="directory-empty"><Search size={22} /><strong>دسته‌ای پیدا نشد</strong><p>عبارت دیگری جست‌وجو کن یا جست‌وجو را پاک کن.</p><button type="button" onClick={() => setQuery('')}>نمایش همه دسته‌ها</button></div>}
    <div className="directory-grid">
      {visibleCategories.map((category) => {
        const Icon = iconMap[category.id] || Grid2X2
        const count = products.filter((product) => product.categories.includes(category.id)).length
        return <section className="directory-card" key={category.id} aria-label={category.label}>
          <button type="button" className="directory-card-head" onClick={() => go({ type: 'category', id: category.id })}>
            <span className="directory-icon" style={{ background: category.color }}><Icon size={22} /></span>
            <span className="directory-card-title"><strong>{category.label}</strong><small>{fa(count)} کالای نمونه</small></span>
            <span className="directory-thumb"><img src={assetUrl(category.image)} alt="" loading="lazy" /></span>
          </button>
          <div className="directory-subcategories">{category.sub.map((item) => {
            const subCount = products.filter((product) => product.subcategories?.[category.id]?.includes(item.id)).length
            return <button type="button" key={item.id} onClick={() => go({ type: 'category', id: category.id, sub: item.id })}><span>{item.label}</span><small>{fa(subCount)}</small><ChevronLeft size={14} /></button>
          })}</div>
          <button type="button" className="directory-all" onClick={() => go({ type: 'category', id: category.id })}>مشاهده همه کالاها <ChevronLeft size={15} /></button>
        </section>
      })}
    </div>
  </main>
}

function NewArrivals({ favorites, onFavorite, onAdd, onOpen, go }) {
  const products = useContext(CatalogContext)
  const ids = ['bed-bath-kit', 'lighting-kit', 'office-kit', 'party-kit', 'cleaning-kit', 'pet-care-kit']
  const selected = ids.map((id) => products.find((product) => product.id === id)).filter(Boolean)
  return <section className="best-section new-section section-space">
    <div className="section-heading inline"><div><span className="heading-eyebrow">انتخاب‌های تازه، حال خوب تازه</span><h2><Sparkles size={23} /> تازه‌های فروشگاه</h2></div><button type="button" className="section-link" onClick={() => go({ type: 'all', sort: 'newest' })}>مشاهده همه <ChevronLeft size={17} /></button></div>
    <div className="best-grid">{selected.map((product) => <ProductCard key={product.id} product={product} isFavorite={favorites.includes(product.id)} onFavorite={onFavorite} onAdd={onAdd} onOpen={onOpen} go={go} />)}</div>
  </section>
}

function HomePage(props) {
  return <main className="container-wide home-main"><Hero go={props.go} /><QuickLinks go={props.go} onNotice={props.onNotice} /><Deals {...props} /><SupermarketBanner go={props.go} /><CategorySection go={props.go} /><PromoCards go={props.go} /><NewArrivals {...props} /><BestSelling {...props} /><Discover go={props.go} /></main>
}

function Catalog({ view, go, favorites, onFavorite, onAdd, onOpen }) {
  const products = useContext(CatalogContext)
  const [sort, setSort] = useState(view.sort || 'suggested')
  const [discountOnly, setDiscountOnly] = useState(false)
  const [availableOnly, setAvailableOnly] = useState(false)
  const subNavRef = useRef(null)
  const categoryFilterRef = useRef(null)
  useEffect(() => { setSort(view.sort || 'suggested'); setDiscountOnly(false); setAvailableOnly(false) }, [view])
  useEffect(() => {
    let cancelled = false
    const revealActive = () => {
      const list = categoryFilterRef.current
      const active = list?.querySelector('button.active')
      if (!list || !active) return
      const container = list.getBoundingClientRect()
      const item = active.getBoundingClientRect()
      if (container.height && (item.top < container.top || item.bottom > container.bottom)) {
        list.scrollTop += item.top - container.top - (container.height - item.height) / 2
      }
    }
    revealActive()
    document.fonts?.ready.then(() => { if (!cancelled) revealActive() })
    window.addEventListener('resize', revealActive)
    return () => { cancelled = true; window.removeEventListener('resize', revealActive) }
  }, [view.type, view.id])
  useEffect(() => {
    const revealActive = () => {
      const nav = subNavRef.current
      const active = nav?.querySelector('button.active')
      if (!nav || !active) return
      const container = nav.getBoundingClientRect()
      const item = active.getBoundingClientRect()
      if (item.left < container.left) nav.scrollBy({ left: item.left - container.left - 8 })
      else if (item.right > container.right) nav.scrollBy({ left: item.right - container.right + 8 })
    }
    revealActive()
    window.addEventListener('resize', revealActive)
    return () => window.removeEventListener('resize', revealActive)
  }, [view.id, view.sub])
  const category = categories.find((item) => item.id === view.id)
  const subcategory = category?.sub.find((item) => item.id === view.sub)
  const invalidCategory = view.type === 'category' && (!category || Boolean(view.sub && !subcategory))
  let title = 'همه کالاها'
  if (view.type === 'deals') title = 'پیشنهادهای شگفت‌انگیز'
  if (view.type === 'category') title = invalidCategory ? 'دسته‌بندی پیدا نشد' : subcategory?.label || category.label
  if (view.type === 'favorites') title = 'علاقه‌مندی‌های من'
  if (view.type === 'search') title = `نتایج جستجو برای «${view.query}»`
  const result = useMemo(() => {
    let list = products.filter((product) => {
      if (invalidCategory) return false
      if (view.type === 'category' && !product.categories.includes(view.id)) return false
      if (view.type === 'category' && view.sub && !product.subcategories?.[view.id]?.includes(view.sub)) return false
      if (view.type === 'favorites' && !favorites.includes(product.id)) return false
      if (view.type === 'deals' && !product.discount) return false
      if (view.type === 'search' && !searchableProduct(product).includes(normalize(view.query))) return false
      if (discountOnly && !product.discount) return false
      if (availableOnly && product.stock === 0) return false
      return true
    })
    if (sort === 'cheapest') list = [...list].sort((a, b) => a.price - b.price)
    if (sort === 'expensive') list = [...list].sort((a, b) => b.price - a.price)
    if (sort === 'popular') list = [...list].sort((a, b) => (b.sold || 0) - (a.sold || 0))
    if (sort === 'newest') list = [...list].reverse()
    return list
  }, [view, favorites, sort, discountOnly, availableOnly, products, invalidCategory])
  return <main className="container-wide catalog-main">
    <div className="breadcrumbs"><button type="button" onClick={() => go({ type: 'home' })}>دیجی‌کارن</button><ChevronLeft size={14} />{category && subcategory && <><button type="button" onClick={() => go({ type: 'category', id: category.id })}>{category.label}</button><ChevronLeft size={14} /></>}<span>{title}</span></div>
    <div className="catalog-title"><div><span className="heading-eyebrow">یه انتخاب خوب، یه حس خوب</span><h1>{title}</h1><p>{fa(result.length)} کالای نمونه برای شما</p></div><button type="button" className="back-home" onClick={() => go({ type: 'home' })}><ArrowRight size={17} /> بازگشت به خانه</button></div>
    {category && !invalidCategory && <nav className="subcategory-nav" ref={subNavRef} aria-label={`زیردسته‌های ${category.label}`}>
      <button type="button" className={!view.sub ? 'active' : ''} aria-pressed={!view.sub} onClick={() => go({ type: 'category', id: category.id })}>همه {category.label}<small>{fa(products.filter((product) => product.categories.includes(category.id)).length)}</small></button>
      {category.sub.map((item) => <button type="button" key={item.id} className={view.sub === item.id ? 'active' : ''} aria-pressed={view.sub === item.id} onClick={() => go({ type: 'category', id: category.id, sub: item.id })}>{item.label}<small>{fa(products.filter((product) => product.subcategories?.[category.id]?.includes(item.id)).length)}</small></button>)}
    </nav>}
    <div className="catalog-layout"><aside className="filter-panel"><div className="filter-heading"><SlidersHorizontal size={19} /><strong>فیلترها</strong><button type="button" onClick={() => { setDiscountOnly(false); setAvailableOnly(false) }}>حذف فیلترها</button></div><div className="filter-group"><h3>دسته‌بندی کالاها</h3><div className="filter-category-list" ref={categoryFilterRef}>{categories.map((item) => <button type="button" className={view.type === 'category' && view.id === item.id ? 'active' : ''} key={item.id} onClick={() => go({ type: 'category', id: item.id })}>{item.label}<ChevronLeft size={14} /></button>)}</div></div><label className="filter-toggle"><span>فقط کالاهای تخفیف‌دار</span><input type="checkbox" checked={discountOnly} onChange={(event) => setDiscountOnly(event.target.checked)} /><i /></label>{!STATIC_DEMO && <label className="filter-toggle available-toggle"><span>فقط کالاهای موجود</span><input type="checkbox" checked={availableOnly} onChange={(event) => setAvailableOnly(event.target.checked)} /><i /></label>}<div className="filter-note"><ShieldCheck size={21} /><span>خریدی مطمئن با<br /><b>دیجی‌کارن</b></span></div></aside>
      <div className="catalog-content">{!STATIC_DEMO && <div className="mobile-catalog-filters"><label><input type="checkbox" checked={availableOnly} onChange={(event) => setAvailableOnly(event.target.checked)} /> فقط کالاهای موجود</label></div>}<div className="sort-bar"><span><SlidersHorizontal size={17} /> مرتب‌سازی:</span>{[['suggested', 'پیشنهادی'], ['newest', 'جدیدترین'], ['popular', 'پرفروش‌ترین'], ['cheapest', 'ارزان‌ترین'], ['expensive', 'گران‌ترین']].map(([id, label]) => <button type="button" key={id} className={sort === id ? 'active' : ''} aria-pressed={sort === id} onClick={() => setSort(id)}>{label}</button>)}<small>{fa(result.length)} کالا</small></div>
        {result.length ? <div className="catalog-grid">{result.map((product) => <ProductCard key={product.id} product={product} isFavorite={favorites.includes(product.id)} onFavorite={onFavorite} onAdd={onAdd} onOpen={onOpen} go={go} />)}</div> : <div className="empty-results"><span><Search size={35} /></span><h2>{invalidCategory ? 'این دسته‌بندی وجود ندارد.' : view.type === 'favorites' ? 'هنوز چیزی به علاقه‌مندی‌هات اضافه نکردی!' : 'چیزی پیدا نکردیم!'}</h2><p>{view.type === 'favorites' ? 'با زدن قلب کنار هر کالا، می‌تونی بعداً راحت پیداش کنی.' : 'عبارت دیگری را جستجو کن یا از میان دسته‌بندی‌ها انتخاب کن.'}</p><button type="button" className="primary-button" onClick={() => go({ type: 'all' })}>مشاهده همه کالاها <ArrowLeft size={17} /></button></div>}
      </div>
    </div>
  </main>
}

function ProductPage({ id, catalogStatus, cart, favorites, onFavorite, onAdd, onOpen, go, openImage, openCart, notify }) {
  const products = useContext(CatalogContext)
  const product = products.find((item) => item.id === id)
  const [quantity, setQuantity] = useState(1)
  const [showShareLink, setShowShareLink] = useState(false)
  const inCart = Math.max(0, Number(cart[id]) || 0)
  const maxTotal = productQuantityLimit(product)
  const remaining = quantityAvailableToAdd(product, inCart)

  useEffect(() => { setQuantity((current) => Math.max(1, Math.min(current, remaining || 1))) }, [remaining])

  if (!product) return <main className="container-wide product-page product-not-found">
    <div className="breadcrumbs"><button type="button" onClick={() => go({ type: 'home' })}>دیجی‌کارن</button><ChevronLeft size={14} /><span>کالا</span></div>
    <div className="empty-results"><span><Search size={35} /></span><h1>{catalogStatus === 'loading' ? 'در حال دریافت کاتالوگ...' : 'این کالا پیدا نشد'}</h1><p>{catalogStatus === 'loading' ? 'کمی صبر کنید.' : 'ممکن است شناسه کالا نادرست باشد یا کالا در کاتالوگ فعلی وجود نداشته باشد.'}</p><button type="button" className="primary-button" onClick={() => go({ type: 'all' })}>مشاهده همه کالاها <ArrowLeft size={17} /></button></div>
  </main>

  const primaryCategory = categories.find((category) => category.id === product.categories[0])
  const primarySubcategory = primaryCategory?.sub.find((item) => product.subcategories?.[primaryCategory.id]?.includes(item.id))
  const related = relatedProducts(product, products)
  const shareUrl = new URL(viewUrl({ type: 'product', id: product.id }), window.location.href).href
  const stockText = catalogStatus === 'static' ? 'موجودی واقعی در نسخه نمایشی مشخص نیست' : catalogStatus === 'offline' ? 'اتصال به موجودی آزمایشی برقرار نیست' : product.stock == null ? 'در حال دریافت موجودی آزمایشی' : product.stock > 0 ? `${fa(product.stock)} عدد موجودی آزمایشی` : 'این کالا در موجودی آزمایشی ناموجود است'
  const copyLink = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(shareUrl)
      setShowShareLink(false)
      notify('پیوند کالا کپی شد')
    } catch { setShowShareLink(true) }
  }

  return <main className="container-wide product-page">
    <nav className="breadcrumbs product-breadcrumbs" aria-label="مسیر کالا">
      <button type="button" onClick={() => go({ type: 'home' })}>دیجی‌کارن</button><ChevronLeft size={14} />
      {primaryCategory && <><button type="button" onClick={() => go({ type: 'category', id: primaryCategory.id })}>{primaryCategory.label}</button><ChevronLeft size={14} /></>}
      {primarySubcategory && <><button type="button" onClick={() => go({ type: 'category', id: primaryCategory.id, sub: primarySubcategory.id })}>{primarySubcategory.label}</button><ChevronLeft size={14} /></>}
      <span>{product.title}</span>
    </nav>

    <section className="product-page-hero" aria-label="اطلاعات و خرید کالا">
      <div className="product-page-gallery">
        <div className="product-gallery-actions">
          <button type="button" className={favorites.includes(product.id) ? 'is-favorite' : ''} aria-label={favorites.includes(product.id) ? 'حذف از علاقه‌مندی‌ها' : 'افزودن به علاقه‌مندی‌ها'} onClick={() => onFavorite(product.id)}><Heart size={20} fill={favorites.includes(product.id) ? 'currentColor' : 'none'} /></button>
          <button type="button" aria-label="کپی پیوند کالا" onClick={copyLink}><Share2 size={19} /></button>
        </div>
        <button type="button" className="product-image-trigger" onClick={() => openImage(product)} aria-label="نمایش بزرگ‌تر تصویر کالا"><img src={assetUrl(product.image)} alt={product.title} /><span><ZoomIn size={15} /> بزرگ‌نمایی تصویر</span></button>
        <p>تصویر محصول نمونه است</p>
        {showShareLink && <div className="product-share-fallback"><label htmlFor="product-share-url">پیوند را انتخاب و کپی کنید</label><input id="product-share-url" dir="ltr" readOnly value={shareUrl} onFocus={(event) => event.target.select()} /></div>}
      </div>

      <div className="product-page-summary">
        <span className="product-page-badge"><Sparkles size={14} /> انتخاب دیجی‌کارن</span>
        <h1>{product.title}</h1>
        <div className="product-page-meta"><span><Star size={16} fill="currentColor" /> {product.rating}</span><span>{fa(product.reviews)} دیدگاه نمونه</span><span>شناسه: <b dir="ltr">{product.id}</b></span></div>
        <div className="product-page-features"><h2>ویژگی‌های کالا</h2><ul>{product.features.map((feature) => <li key={feature}><Check size={16} />{feature}</li>)}</ul></div>
        <div className="product-category-tags"><span>دسته‌بندی:</span>{product.categories.map((categoryId) => {
          const category = categories.find((item) => item.id === categoryId)
          return category && <button type="button" key={categoryId} onClick={() => go({ type: 'category', id: categoryId })}>{category.label}<ChevronLeft size={13} /></button>
        })}</div>
        <div className="product-page-note"><ShieldCheck size={18} /><span>مشخصات و تصاویر این کالا صرفاً برای نمایش فروشگاه هستند.</span></div>
      </div>

      <aside className="product-buy-box" aria-label="خرید آزمایشی">
        <div className="product-seller"><span className="product-seller-icon"><Store size={20} /></span><div><strong>دیجی‌کارن</strong><small>فروشنده نمونه</small></div></div>
        <div className={`product-stock ${product.stock === 0 ? 'out-of-stock' : ''}`}><span /><strong>{stockText}</strong></div>
        <div className="product-buy-price"><span>قیمت نمونه</span><Price product={product} /></div>
        {inCart > 0 && <div className="product-in-cart">{fa(inCart)} عدد از این کالا در سبد شماست.</div>}
        {remaining > 0 && <div className="product-quantity-row"><span>تعداد</span><div className="product-quantity" aria-label="انتخاب تعداد کالا"><button type="button" aria-label="کاهش تعداد کالا" disabled={quantity <= 1} onClick={() => setQuantity((current) => Math.max(1, current - 1))}><Minus size={16} /></button><output aria-live="polite">{fa(quantity)}</output><button type="button" aria-label="افزایش تعداد کالا" disabled={quantity >= remaining} onClick={() => setQuantity((current) => Math.min(remaining, current + 1))}><Plus size={16} /></button></div></div>}
        <button type="button" className="primary-button product-add-button" disabled={!remaining} onClick={() => { if (onAdd(product.id, quantity)) setQuantity(1) }}><ShoppingCart size={19} />{product.stock === 0 ? 'ناموجود' : remaining ? 'افزودن به سبد خرید' : 'حداکثر تعداد در سبد'}</button>
        {inCart > 0 && <button type="button" className="product-open-cart" onClick={openCart}>مشاهده سبد خرید <ChevronLeft size={16} /></button>}
        {inCart > maxTotal && <p className="product-cart-warning">تعداد این کالا در سبد از موجودی فعلی بیشتر است؛ سبد را بررسی کنید.</p>}
        <div className="product-demo-note"><Truck size={18} /><span>{STATIC_DEMO ? 'ثبت سفارش، پرداخت و ارسال در این نسخه فعال نیست.' : 'این خرید آزمایشی است؛ پرداخت و ارسال واقعی انجام نمی‌شود.'}</span></div>
      </aside>
    </section>

    <section className="product-description" aria-labelledby="product-description-heading">
      <div><span className="heading-eyebrow">بیشتر درباره این انتخاب</span><h2 id="product-description-heading">معرفی و مشخصات نمونه</h2><p>«{product.title}» در کاتالوگ نمونه دیجی‌کارن قرار دارد. اطلاعات، تصاویر و قیمت برای نمایش تجربه فروشگاه هستند و مشخصات نهایی یک کالای واقعی نیستند.</p></div>
      <ul>{product.features.map((feature) => <li key={feature}><span><Check size={15} /></span>{feature}</li>)}</ul>
      <div className="product-review-notice"><Star size={19} /><div><strong>دیدگاه‌ها و امتیازها نمونه‌اند</strong><p>امکان ثبت یا مشاهده دیدگاه‌های واقعی در این نسخه فعال نیست.</p></div></div>
    </section>

    {related.length > 0 && <section className="product-related section-space" aria-labelledby="product-related-heading">
      <div className="section-heading inline"><div><span className="heading-eyebrow">انتخاب‌های بیشتر از همین دسته‌ها</span><h2 id="product-related-heading"><Sparkles size={21} /> کالاهای مرتبط</h2></div>{primaryCategory && <button type="button" className="section-link" onClick={() => go({ type: 'category', id: primaryCategory.id })}>مشاهده دسته <ChevronLeft size={17} /></button>}</div>
      <div className="product-related-grid" style={{ '--related-columns': Math.max(3, related.length) }}>{related.map((item) => <ProductCard key={item.id} product={item} isFavorite={favorites.includes(item.id)} onFavorite={onFavorite} onAdd={onAdd} onOpen={onOpen} go={go} />)}</div>
    </section>}
  </main>
}

function Footer({ go, onNotice, notify }) {
  const [email, setEmail] = useState('')
  const assurances = [
    { Icon: Smartphone, title: 'وب‌اپ قابل نصب' }, { Icon: Grid2X2, title: 'دسته‌بندی متنوع' },
    { Icon: ShoppingBag, title: 'سبد خرید محلی' }, { Icon: Heart, title: 'فهرست علاقه‌مندی‌ها' }, { Icon: Info, title: 'اطلاعات نمایشی' },
  ]
  return <footer className="footer"><div className="container-wide">
    <div className="footer-top"><div><Logo onClick={() => go({ type: 'home' })} /><p>کنار شماییم برای یک خرید خوب و دوست‌داشتنی.</p></div><button type="button" className="back-to-top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>بازگشت به بالا <ArrowUp size={17} /></button></div>
    <div className="assurances">{assurances.map(({ Icon, title }) => <div key={title}><Icon size={29} strokeWidth={1.4} /><span>{title}</span></div>)}</div>
    <div className="footer-columns"><div><h3>با دیجی‌کارن</h3><button type="button" onClick={onNotice}>درباره دیجی‌کارن</button><button type="button" onClick={onNotice}>تماس با ما</button><button type="button" onClick={onNotice}>فرصت‌های شغلی</button></div><div><h3>خدمات مشتریان</h3><button type="button" onClick={onNotice}>پاسخ به پرسش‌های متداول</button><button type="button" onClick={onNotice}>رویه بازگشت کالا</button><button type="button" onClick={onNotice}>حریم خصوصی</button></div><div><h3>راهنمای خرید</h3><button type="button" onClick={onNotice}>نحوه ثبت سفارش</button><button type="button" onClick={onNotice}>روش‌های ارسال</button><button type="button" onClick={onNotice}>شیوه‌های پرداخت</button></div><div className="newsletter"><h3>از تخفیف‌ها و تازه‌ها باخبر شو!</h3>{STATIC_DEMO ? <p>خبرنامه در نسخه نمایشی فعال نیست.</p> : <><p>ایمیلت رو برامون بذار تا با هم در ارتباط باشیم.</p><form onSubmit={(event) => { event.preventDefault(); if (email.trim()) { notify('خبرنامه در نسخه نمایشی به سرویسی متصل نیست.'); setEmail('') } }}><input type="email" aria-label="آدرس ایمیل" placeholder="ایمیل شما" value={email} onChange={(event) => setEmail(event.target.value)} required /><button type="submit">ثبت</button></form><small>ما هم مثل تو از پیام‌های اضافی خوشمون نمیاد.</small></>}</div></div>
    <div className="footer-bottom"><span>© دیجی‌کارن؛ خرید خوب، حال خوب.</span><span>این فروشگاه و اطلاعات کالاها نمونه نمایشی هستند.</span></div>
  </div></footer>
}

function ModalShell({ children, close, className = '', label }) {
  const panelRef = useRef(null)
  useEffect(() => {
    const previousFocus = document.activeElement
    const panel = panelRef.current
    const selector = 'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
    const focusable = () => Array.from(panel.querySelectorAll(selector)).filter((element) => element.getClientRects().length > 0)
    const focusTimer = window.setTimeout(() => (focusable()[0] || panel).focus(), 0)
    const trapFocus = (event) => {
      if (event.key !== 'Tab') return
      const elements = focusable()
      if (!elements.length) { event.preventDefault(); panel.focus(); return }
      const first = elements[0]
      const last = elements[elements.length - 1]
      if (event.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', trapFocus)
    return () => {
      window.clearTimeout(focusTimer)
      document.removeEventListener('keydown', trapFocus)
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus()
    }
  }, [])
  return <div className={`modal-backdrop ${className}`} onMouseDown={(event) => { if (event.target === event.currentTarget) close() }}><div ref={panelRef} tabIndex="-1" className="modal-panel" role="dialog" aria-modal="true" aria-label={label}>{children}</div></div>
}

function ProductImageModal({ product, close }) {
  return <ModalShell close={close} className="product-image-modal" label={`تصویر ${product.title}`}>
    <div className="modal-heading"><strong>تصویر کالا</strong><button type="button" className="modal-close" onClick={close} aria-label="بستن"><X size={21} /></button></div>
    <div className="product-image-modal-content"><img src={assetUrl(product.image)} alt={product.title} /><p>{product.title}</p><small>تصویر این کالا نمونه است.</small></div>
  </ModalShell>
}

function ProductModal({ product, close, onAdd, isFavorite, onFavorite, openCart, go }) {
  const [added, setAdded] = useState(false)
  return <ModalShell close={close} className="product-modal" label={`جزئیات ${product.title}`}><div className="modal-heading"><span>جزئیات کالا</span><button type="button" className="modal-close" onClick={close} aria-label="بستن"><X size={21} /></button></div><div className="product-detail"><div className="detail-image"><img src={assetUrl(product.image)} alt={product.title} /><button type="button" className={`detail-heart ${isFavorite ? 'is-favorite' : ''}`} onClick={() => onFavorite(product.id)} aria-label={isFavorite ? 'حذف از علاقه‌مندی‌ها' : 'افزودن به علاقه‌مندی‌ها'}><Heart size={21} fill={isFavorite ? 'currentColor' : 'none'} /></button></div><div className="detail-info"><span className="detail-tag"><Sparkles size={14} /> انتخاب دیجی‌کارن</span><h2>{product.title}</h2><div className="detail-rating"><Star size={16} fill="currentColor" /> {product.rating} <span>({fa(product.reviews)} دیدگاه نمونه)</span></div><div className="detail-features"><strong>ویژگی‌های کالا</strong>{product.features.map((feature) => <span key={feature}><Check size={15} /> {feature}</span>)}</div><div className="detail-guarantee"><ShieldCheck size={19} /> اطلاعات و شرایط خرید نمونه هستند</div>{product.stock != null && <div className="detail-stock">{product.stock > 0 ? `${fa(product.stock)} عدد موجودی آزمایشی` : 'این کالا در موجودی آزمایشی ناموجود است'}</div>}<div className="detail-purchase"><Price product={product} /><button type="button" className="primary-button" disabled={product.stock === 0} onClick={() => { if (onAdd(product.id)) setAdded(true) }}><ShoppingCart size={19} /> {product.stock === 0 ? 'ناموجود' : 'افزودن به سبد خرید'}</button>{added && <button type="button" className="detail-view-cart" onClick={openCart}>مشاهده سبد خرید <ChevronLeft size={15} /></button>}</div></div></div><div className="quick-view-footer"><a href={viewUrl({ type: 'product', id: product.id })} onClick={(event) => followProductLink(event, product.id, (next) => { close(); go(next) })}>مشاهده صفحه کامل کالا <ArrowLeft size={15} /></a><p className="modal-disclaimer">اطلاعات، قیمت و موجودی این کالا در نسخه نمایشی نمونه هستند.</p></div></ModalShell>
}

function CartModal({ cart, close, changeQuantity, go, openCheckout }) {
  const products = useContext(CatalogContext)
  const cartItems = products.filter((item) => cart[item.id] > 0)
  const count = cartItems.reduce((sum, item) => sum + cart[item.id], 0)
  const total = cartItems.reduce((sum, item) => sum + item.price * cart[item.id], 0)
  const saving = cartItems.reduce((sum, item) => sum + (item.oldPrice - item.price) * cart[item.id], 0)
  return <ModalShell close={close} className="cart-modal" label="سبد خرید"><div className="drawer-heading"><div><h2>سبد خرید شما</h2><span>{fa(count)} کالا</span></div><button type="button" className="modal-close" onClick={close} aria-label="بستن"><X size={21} /></button></div>
    {cartItems.length ? <><div className="cart-items">{cartItems.map((item) => <div className="cart-item" key={item.id}><img src={assetUrl(item.image)} alt="" /><div className="cart-item-info"><h3><a href={viewUrl({ type: 'product', id: item.id })} onClick={(event) => followProductLink(event, item.id, (next) => { close(); go(next) })}>{item.title}</a></h3><p><ShieldCheck size={14} /> اطلاعات کالا نمونه است</p><strong>{fa(item.price)} <small>تومان</small></strong><div className="quantity-control"><button type="button" aria-label={`افزایش تعداد ${item.title}`} onClick={() => changeQuantity(item.id, 1)}><Plus size={16} /></button><b>{fa(cart[item.id])}</b><button type="button" aria-label={`${cart[item.id] === 1 ? 'حذف' : 'کاهش تعداد'} ${item.title}`} onClick={() => changeQuantity(item.id, -1)}>{cart[item.id] === 1 ? <Trash2 size={15} /> : <Minus size={16} />}</button></div></div></div>)}</div><div className="cart-summary"><div><span>جمع سبد خرید ({fa(count)} کالا)</span><b>{fa(total + saving)} تومان</b></div><div className="cart-saving"><span>سود شما از خرید</span><b>{fa(saving)} تومان</b></div><div className="cart-total"><span>جمع نمونه</span><b>{fa(total)} <small>تومان</small></b></div><button type="button" className="primary-button" onClick={openCheckout}>{STATIC_DEMO ? 'بررسی وضعیت سفارش' : 'ادامه فرایند خرید'} <ArrowLeft size={18} /></button><p>{STATIC_DEMO ? 'ثبت سفارش در این نسخه فعال نیست.' : 'ادامه خرید صرفاً آزمایشی است؛ پرداخت و ارسال واقعی ندارد.'}</p></div></> : <div className="empty-cart"><span><ShoppingBag size={48} strokeWidth={1.3} /></span><h3>سبد خریدت هنوز خالیه!</h3><p>کلی کالای جذاب منتظرت هستن.</p><button type="button" className="primary-button" onClick={() => { close(); go({ type: 'all' }) }}>بریم خرید <ArrowLeft size={17} /></button></div>}
  </ModalShell>
}

function StaticCheckoutModal({ close, backToCart }) {
  return <ModalShell close={close} className="small-modal availability-modal" label="وضعیت سفارش در نسخه نمایشی">
    <button type="button" className="modal-close close-floating" onClick={close} aria-label="بستن"><X size={21} /></button>
    <span className="availability-icon"><ShoppingBag size={25} /></span>
    <h2>ثبت سفارش در این نسخه فعال نیست</h2>
    <p>گیت‌هاب پیجز فقط نسخهٔ نمایشی وب‌اپ را نمایش می‌دهد و به سرور سفارش متصل نیست. پرداخت و ارسال نیز انجام نمی‌شود.</p>
    <div className="availability-note">سبد خرید و علاقه‌مندی‌ها فقط در همین مرورگر ذخیره می‌شوند؛ هیچ اطلاعات شخصی برای سفارش دریافت نمی‌شود.</div>
    <button type="button" className="primary-button" onClick={backToCart}><ArrowRight size={17} /> بازگشت به سبد خرید</button>
  </ModalShell>
}

function InstallModal({ close, installPrompt, install, installed }) {
  return <ModalShell close={close} className="small-modal install-modal" label="نصب وب‌اپ دیجی‌کارن">
    <button type="button" className="modal-close close-floating" onClick={close} aria-label="بستن"><X size={21} /></button>
    <span className="availability-icon"><Smartphone size={25} /></span>
    <h2>دیجی‌کارن، همیشه همراهت</h2>
    <p>وب‌اپ را به صفحه اصلی دستگاهت اضافه کن. بعد از یک بار بازدید و آماده‌شدن داده‌ها، مرور کالاهای نمونه بدون اینترنت هم ممکن است.</p>
    {installed ? <div className="availability-note">وب‌اپ در حالت نصب‌شده باز است یا درخواست نصب پذیرفته شده است.</div> : installPrompt ? <button type="button" className="primary-button" onClick={install}><Download size={17} /> نصب وب‌اپ</button> : <div className="availability-note">در منوی مرورگر گزینهٔ «نصب برنامه» یا «افزودن به صفحه اصلی» را انتخاب کن. در آیفون، از دکمهٔ اشتراک‌گذاری Safari و سپس «Add to Home Screen» استفاده کن.</div>}
  </ModalShell>
}

function StaticLoginModal({ close }) {
  return <ModalShell close={close} className="small-modal availability-modal" label="وضعیت ورود">
    <button type="button" className="modal-close close-floating" onClick={close} aria-label="بستن"><X size={21} /></button>
    <span className="availability-icon"><UserRound size={25} /></span>
    <h2>ورود در نسخه نمایشی فعال نیست</h2>
    <p>این نسخه به سرویس حساب کاربری یا پیامک متصل نیست؛ برای مرور کالاها نیازی به وارد کردن شماره موبایل ندارید.</p>
    <button type="button" className="primary-button" onClick={close}>متوجه شدم</button>
  </ModalShell>
}

function CheckoutModal({ cart, city, close, backToCart, busy, setBusy, catalogStatus, refreshCatalog, onSuccess }) {
  const products = useContext(CatalogContext)
  const [customer, setCustomer] = useState({ name: '', phone: '', city, address: '' })
  const [error, setError] = useState('')
  const [receipt, setReceipt] = useState(null)
  const submitting = useRef(false)
  const cartItems = products.filter((item) => cart[item.id] > 0)
  const count = cartItems.reduce((sum, item) => sum + cart[item.id], 0)
  const total = cartItems.reduce((sum, item) => sum + item.price * cart[item.id], 0)
  const update = (key) => (event) => { setCustomer((current) => ({ ...current, [key]: event.target.value })); setError('') }

  const submit = async (event) => {
    event.preventDefault()
    if (submitting.current) return
    const clean = {
      name: customer.name.trim().replace(/\s+/g, ' '),
      phone: normalize(customer.phone).replace(/\s/g, ''),
      city: customer.city.trim().replace(/\s+/g, ' '),
      address: customer.address.trim().replace(/\s+/g, ' '),
    }
    if (clean.name.length < 2 || !/^09\d{9}$/.test(clean.phone) || clean.city.length < 2 || clean.address.length < 10) {
      setError('نام، شماره موبایل، شهر و نشانی آزمایشی معتبر را کامل کنید.')
      return
    }
    const ids = Object.keys(cart).filter((id) => cart[id] > 0).sort()
    if (!ids.length || ids.length !== cartItems.length) { setError('سبد خرید را دوباره بررسی کنید.'); return }
    const items = ids.map((id) => {
      const product = cartItems.find((item) => item.id === id)
      return { id, quantity: cart[id], expectedPrice: product.price }
    })
    if (cartItems.some((item) => item.stock != null && cart[item.id] > item.stock)) {
      setError('موجودی برخی کالاها تغییر کرده است؛ به سبد خرید برگردید و تعداد را اصلاح کنید.')
      return
    }
    const body = { customer: clean, items }
    submitting.current = true
    setBusy(true)
    setError('')
    let timer
    try {
      const key = await keyForCheckout(body)
      const controller = new AbortController()
      timer = window.setTimeout(() => controller.abort(), 12000)
      const response = await fetch('/api/demo-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
      let result
      try { result = await response.json() } catch { throw new Error('پاسخ سرور معتبر نبود؛ دوباره تلاش کنید.') }
      if (!response.ok) {
        if (response.status === 409) await refreshCatalog()
        throw new Error(result.error?.message || 'ثبت سفارش آزمایشی ناموفق بود.')
      }
      if (!result.order?.reference || result.order.status !== 'demo') throw new Error('پاسخ سرور معتبر نبود؛ دوباره تلاش کنید.')
      clearCheckoutKey()
      setReceipt(result.order)
      onSuccess()
      refreshCatalog()
    } catch (failure) {
      setError(failure.name === 'AbortError' ? 'پاسخ سرور دیر رسید؛ با همین اطلاعات دوباره تلاش کنید.' : failure instanceof TypeError ? 'ارتباط با سرور برقرار نشد؛ اتصال را بررسی و دوباره تلاش کنید.' : failure.message || 'ثبت سفارش آزمایشی ناموفق بود؛ دوباره تلاش کنید.')
    } finally {
      window.clearTimeout(timer)
      submitting.current = false
      setBusy(false)
    }
  }

  if (receipt) return <ModalShell close={close} className="checkout-modal" label="نتیجه سفارش آزمایشی">
    <div className="modal-heading"><strong>نتیجه سفارش آزمایشی</strong><button type="button" className="modal-close" onClick={close} aria-label="بستن"><X size={21} /></button></div>
    <div className="checkout-receipt" role="status">
      <span className="receipt-icon"><CheckCircle2 size={38} /></span>
      <h2>سفارش آزمایشی ثبت شد</h2>
      <p>این سفارش فقط برای آزمایش فروشگاه است؛ هیچ پرداختی انجام نشده و کالایی ارسال نخواهد شد.</p>
      <div className="receipt-reference"><span>شماره سفارش آزمایشی</span><strong dir="ltr">{receipt.reference}</strong></div>
      <div className="receipt-details"><span>{fa(receipt.itemCount)} کالا</span><span>جمع نمونه: <b>{fa(receipt.total)} تومان</b></span></div>
      <button type="button" className="primary-button" onClick={close}>بازگشت به فروشگاه <ArrowLeft size={18} /></button>
    </div>
  </ModalShell>

  return <ModalShell close={close} className="checkout-modal" label="ثبت سفارش آزمایشی">
    <div className="modal-heading"><div className="checkout-heading"><strong>تکمیل سفارش آزمایشی</strong><span>یک قدم تا بررسی تجربه خرید</span></div><button type="button" className="modal-close" disabled={busy} onClick={close} aria-label="بستن"><X size={21} /></button></div>
    <div className="checkout-steps" aria-label="مراحل آزمایشی خرید"><span className="done"><Check size={14} /> سبد خرید</span><i /><span className="current"><b>۲</b> اطلاعات سفارش</span><i /><span><b>۳</b> نتیجه آزمایشی</span></div>
    <div className="checkout-layout">
      <form id="checkout-form" className="checkout-form" onSubmit={submit} noValidate>
        <h2>اطلاعات گیرنده آزمایشی</h2>
        <p className="checkout-disclaimer">این اطلاعات در پایگاه‌دادهٔ آزمایشی سرور ذخیره می‌شوند؛ لطفاً فقط اطلاعات ساختگی وارد کنید.</p>
        <label htmlFor="checkout-name">نام و نام خانوادگی</label>
        <input id="checkout-name" value={customer.name} onChange={update('name')} placeholder="مثلاً مشتری آزمایشی" maxLength={80} autoComplete="off" disabled={busy} required />
        <div className="checkout-fields"><div><label htmlFor="checkout-phone">شماره موبایل آزمایشی</label><input id="checkout-phone" value={customer.phone} onChange={update('phone')} placeholder="۰۹۱۲۰۰۰۰۰۰۰" inputMode="tel" dir="ltr" maxLength={20} autoComplete="off" disabled={busy} required /></div><div><label htmlFor="checkout-city">شهر</label><input id="checkout-city" value={customer.city} onChange={update('city')} placeholder="شهر آزمایشی" maxLength={60} autoComplete="off" disabled={busy} required /></div></div>
        <label htmlFor="checkout-address">نشانی آزمایشی</label>
        <textarea id="checkout-address" value={customer.address} onChange={update('address')} placeholder="یک نشانی ساختگی برای تست وارد کنید" maxLength={300} rows={3} autoComplete="off" disabled={busy} required />
        {catalogStatus === 'offline' && <p className="checkout-alert">ارتباط با سرور در دسترس نیست؛ پس از برقراری اتصال دوباره تلاش کنید.</p>}
        {error && <p className="checkout-error" role="alert">{error}</p>}
        <button type="button" className="checkout-back" disabled={busy} onClick={backToCart}><ArrowRight size={16} /> بازگشت به سبد خرید</button>
      </form>
      <aside className="checkout-summary" aria-label="خلاصه سفارش آزمایشی">
        <h2>خلاصه سفارش</h2>
        <div className="checkout-items">{cartItems.map((item) => <div key={item.id}><img src={assetUrl(item.image)} alt="" /><div><strong>{item.title}</strong><span>{fa(cart[item.id])} عدد</span></div></div>)}</div>
        <div className="checkout-total"><span>جمع {fa(count)} کالا</span><b>{fa(total)} <small>تومان</small></b></div>
        <div className="checkout-payment"><CreditCard size={19} /><div><strong>بدون پرداخت</strong><span>درگاه پرداخت متصل نیست</span></div></div>
        <button form="checkout-form" type="submit" className="primary-button" disabled={busy || !cartItems.length}>{busy ? 'در حال ثبت...' : 'ثبت سفارش آزمایشی'} <ArrowLeft size={17} /></button>
        <small className="checkout-summary-note">هیچ مبلغی دریافت نمی‌شود و سفارشی ارسال نخواهد شد.</small>
      </aside>
    </div>
  </ModalShell>
}

function LoginModal({ close, home }) {
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  return <ModalShell close={close} className="small-modal" label="ورود یا ثبت‌نام"><button type="button" className="modal-close close-floating" onClick={close} aria-label="بستن"><X size={21} /></button><Logo onClick={() => { close(); home() }} /><h2>سلام، خوش اومدی!</h2><p>برای ورود یا ثبت‌نام، شماره موبایلت رو وارد کن.</p><form onSubmit={(event) => { event.preventDefault(); if (!/^09\d{9}$/.test(normalize(phone))) { setError('لطفاً یک شماره موبایل معتبر وارد کنید.'); setSubmitted(false); return } setError(''); setSubmitted(true) }}><label htmlFor="phone">شماره موبایل</label><input id="phone" value={phone} onChange={(event) => { setPhone(event.target.value); setError(''); setSubmitted(false) }} inputMode="numeric" autoComplete="tel" dir="ltr" placeholder="۰۹۱۲ ۱۲۳ ۴۵۶۷" />{error && <span className="form-error">{error}</span>}{submitted && <span className="form-notice">این نسخه نمایشی است و به سرویس ورود و پیامک متصل نیست.</span>}<button type="submit" className="primary-button">ادامه <ArrowLeft size={17} /></button></form><small>ورود شما به معنای پذیرش قوانین و حریم خصوصی دیجی‌کارن است.</small></ModalShell>
}

function LocationModal({ close, city, setCity }) {
  const [query, setQuery] = useState('')
  const cities = ['تهران', 'کرج', 'مشهد', 'اصفهان', 'شیراز', 'تبریز', 'قم', 'اهواز', 'رشت', 'یزد', 'کرمان', 'ارومیه']
  return <ModalShell close={close} className="small-modal location-modal" label="انتخاب شهر"><div className="modal-heading"><strong>شهر خود را انتخاب کنید</strong><button type="button" className="modal-close" onClick={close} aria-label="بستن"><X size={21} /></button></div><p>{STATIC_DEMO ? 'شهر مورد نظرت را برای نمایش انتخاب کن؛ ارسال واقعی فعال نیست.' : 'برای دیدن شرایط ارسال، شهر مورد نظرت رو انتخاب کن.'}</p><div className="city-search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="جستجوی شهر" aria-label="جستجوی شهر" /></div><div className="city-list">{cities.filter((item) => normalize(item).includes(normalize(query))).map((item) => <button type="button" key={item} onClick={() => { setCity(item); close() }}><MapPin size={17} />{item}{city === item ? <Check size={17} /> : <ChevronLeft size={17} />}</button>)}{!cities.some((item) => normalize(item).includes(normalize(query))) && <p>شهری با این نام پیدا نشد.</p>}</div></ModalShell>
}

function Support({ open, setOpen }) {
  const [answer, setAnswer] = useState('')
  const faqs = [
    ['چطور سفارش ثبت کنم؟', STATIC_DEMO ? 'در نسخه گیت‌هاب پیجز ثبت سفارش، پرداخت و ارسال فعال نیستند. سبد فقط در همین مرورگر ذخیره می‌شود.' : 'کالاها را به سبد اضافه کن و مراحل سفارش آزمایشی را انجام بده. پرداخت و ارسال واقعی فعال نیستند.'],
    ['شرایط ارسال چطوره؟', 'روش‌ها و هزینه ارسال پس از اتصال فروشگاه به سرویس واقعی مشخص می‌شوند.'],
    ['چطور کالا رو برگردونم؟', 'شرایط بازگشت کالا پس از راه‌اندازی فروشگاه واقعی اعلام خواهد شد.'],
  ]
  return <div className="support-widget">{open && <div className="support-panel"><div className="support-heading"><div><span><Headphones size={20} /></span><div><strong>پشتیبانی دیجی‌کارن</strong><small>همیشه در کنار شما</small></div></div><button type="button" onClick={() => setOpen(false)} aria-label="بستن پشتیبانی"><X size={19} /></button></div><div className="support-body"><h3>سلام، چه کمکی از دستمون برمیاد؟ 👋</h3><p>یکی از موضوعات زیر رو انتخاب کن.</p>{faqs.map(([question, response]) => <button type="button" key={question} onClick={() => setAnswer(answer === response ? '' : response)}>{question}<ChevronLeft size={16} /></button>)}{answer && <div className="support-answer">{answer}</div>}<small>این بخش در نسخه نمایشی به پشتیبان متصل نیست.</small></div></div>}<button type="button" className="support-button" onClick={() => setOpen(!open)} aria-label={open ? 'بستن پشتیبانی' : 'پشتیبانی'}>{open ? <X size={24} /> : <Headphones size={25} />}<i /></button></div>
}

export default function App() {
  const [view, setView] = useState(readView)
  const [catalogProducts, setCatalogProducts] = useState(sampleProducts)
  const [catalogStatus, setCatalogStatus] = useState(STATIC_DEMO ? 'static' : 'loading')
  const [checkoutBusy, setCheckoutBusy] = useState(false)
  const [cart, setCart] = useStoredState('digikaren-cart', {})
  const [favorites, setFavorites] = useStoredState('digikaren-favorites', [])
  const [city, setCity] = useStoredState('digikaren-city', 'تهران')
  const [modal, setModal] = useState(null)
  const [supportOpen, setSupportOpen] = useState(false)
  const [toast, setToast] = useState('')
  const [installPrompt, setInstallPrompt] = useState(null)
  const [appInstalled, setAppInstalled] = useState(() => window.matchMedia('(display-mode: standalone)').matches || Boolean(navigator.standalone))
  const toastTimer = useRef(null)

  useEffect(() => {
    const beforeInstall = (event) => { event.preventDefault(); setInstallPrompt(event) }
    const installed = () => { setAppInstalled(true); setInstallPrompt(null) }
    window.addEventListener('beforeinstallprompt', beforeInstall)
    window.addEventListener('appinstalled', installed)
    return () => { window.removeEventListener('beforeinstallprompt', beforeInstall); window.removeEventListener('appinstalled', installed) }
  }, [])

  const refreshCatalog = useCallback(async () => {
    if (STATIC_DEMO) return false
    try {
      const response = await fetch('/api/catalog', { cache: 'no-store' })
      if (!response.ok) throw new Error('catalog unavailable')
      const result = await response.json()
      if (!Array.isArray(result.products) || !result.products.length) throw new Error('invalid catalog')
      setCatalogProducts(result.products)
      setCatalogStatus('ready')
      return true
    } catch {
      setCatalogStatus('offline')
      return false
    }
  }, [])
  useEffect(() => { refreshCatalog() }, [refreshCatalog])
  useEffect(() => {
    const product = view.type === 'product' ? catalogProducts.find((item) => item.id === view.id) : null
    document.title = view.type === 'product' ? `${product?.title || (catalogStatus === 'loading' ? 'کالا' : 'کالا پیدا نشد')} | دیجی‌کارن` : 'دیجی‌کارن | خرید خوب، حال خوب'
  }, [view.type, view.id, catalogProducts, catalogStatus])
  useEffect(() => {
    const onPop = () => setView(readView())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
  useEffect(() => {
    if (!modal) return undefined
    const onKey = (event) => { if (event.key === 'Escape' && !checkoutBusy) setModal(null) }
    document.addEventListener('keydown', onKey)
    document.body.classList.add('modal-open')
    return () => { document.removeEventListener('keydown', onKey); document.body.classList.remove('modal-open') }
  }, [modal, checkoutBusy])
  useEffect(() => () => window.clearTimeout(toastTimer.current), [])
  const notify = (message) => {
    setToast(message)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(''), 3200)
  }
  const go = (next) => {
    window.history.pushState({}, '', viewUrl(next, window.location.pathname))
    setView(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const limitFor = (id) => {
    const product = catalogProducts.find((item) => item.id === id)
    return productQuantityLimit(product)
  }
  const onAdd = (id, quantity = 1) => {
    const limit = limitFor(id)
    if (!Number.isSafeInteger(quantity) || quantity < 1 || !limit || (Number(cart[id]) || 0) + quantity > limit) {
      notify('موجودی یا حداکثر تعداد مجاز این کالا تکمیل شده است.')
      return false
    }
    setCart((current) => {
      const nextQuantity = (Number(current[id]) || 0) + quantity
      return nextQuantity > limit ? current : { ...current, [id]: nextQuantity }
    })
    notify('به سبد خریدت اضافه شد')
    return true
  }
  const changeQuantity = (id, delta) => {
    const limit = limitFor(id)
    if (delta > 0 && (cart[id] || 0) >= limit) { notify('موجودی یا حداکثر تعداد مجاز این کالا تکمیل شده است.'); return }
    setCart((current) => { const next = { ...current }; const quantity = (next[id] || 0) + delta; if (quantity <= 0) delete next[id]; else next[id] = Math.min(quantity, delta > 0 ? limit : quantity); return next })
  }
  const onFavorite = (id) => { const already = favorites.includes(id); setFavorites((current) => already ? current.filter((item) => item !== id) : [...current, id]); notify(already ? 'از علاقه‌مندی‌ها حذف شد' : 'به علاقه‌مندی‌هات اضافه شد') }
  const openModal = (type, data) => setModal({ type, data })
  const closeModal = () => { if (!checkoutBusy) setModal(null) }
  const installApp = async () => {
    if (!installPrompt) return
    try {
      await installPrompt.prompt()
      const choice = await installPrompt.userChoice
      setInstallPrompt(null)
      if (choice.outcome === 'accepted') { setAppInstalled(true); setModal(null) }
    } catch {
      setInstallPrompt(null)
      notify('برای نصب، از گزینه افزودن به صفحه اصلی در منوی مرورگر استفاده کنید.')
    }
  }
  const onNotice = () => notify('این بخش در نسخه نمایشی فعال نیست.')
  const common = { favorites, onFavorite, onAdd, onOpen: (product) => openModal('product', product), go }
  const cartCount = Object.values(cart).reduce((sum, count) => sum + (Number(count) || 0), 0)
  return <CatalogContext.Provider value={catalogProducts}>
    <Header view={view} go={go} cartCount={cartCount} favorites={favorites} city={city} openModal={openModal} onSupport={() => setSupportOpen(true)} />
    <AppNotice openInstall={() => openModal('install')} />
    {view.type === 'home' ? <HomePage {...common} onNotice={onNotice} /> : view.type === 'categories' ? <CategoryDirectory go={go} /> : view.type === 'product' ? <ProductPage key={view.id} id={view.id} catalogStatus={catalogStatus} cart={cart} {...common} openImage={(product) => openModal('product-image', product)} openCart={() => openModal('cart')} notify={notify} /> : <Catalog key={`${view.type}-${view.id || view.query || ''}-${view.sub || ''}`} view={view} {...common} />}
    <Footer go={go} onNotice={onNotice} notify={notify} />
    <Support open={supportOpen} setOpen={setSupportOpen} />
    {toast && <div className="toast" role="status"><CheckCircle2 size={19} />{toast}</div>}
    {modal?.type === 'product' && <ProductModal product={catalogProducts.find((product) => product.id === modal.data.id) || modal.data} close={closeModal} onAdd={onAdd} isFavorite={favorites.includes(modal.data.id)} onFavorite={onFavorite} openCart={() => openModal('cart')} go={go} />}
    {modal?.type === 'product-image' && <ProductImageModal product={modal.data} close={closeModal} />}
    {modal?.type === 'cart' && <CartModal cart={cart} close={closeModal} changeQuantity={changeQuantity} go={go} openCheckout={() => openModal('checkout')} />}
    {modal?.type === 'checkout' && (STATIC_DEMO ? <StaticCheckoutModal close={closeModal} backToCart={() => openModal('cart')} /> : <CheckoutModal cart={cart} city={city} close={closeModal} backToCart={() => openModal('cart')} busy={checkoutBusy} setBusy={setCheckoutBusy} catalogStatus={catalogStatus} refreshCatalog={refreshCatalog} onSuccess={() => setCart({})} />)}
    {modal?.type === 'login' && (STATIC_DEMO ? <StaticLoginModal close={closeModal} /> : <LoginModal close={closeModal} home={() => go({ type: 'home' })} />)}
    {modal?.type === 'install' && <InstallModal close={closeModal} installPrompt={installPrompt} install={installApp} installed={appInstalled} />}
    {modal?.type === 'location' && <LocationModal close={closeModal} city={city} setCity={setCity} />}
  </CatalogContext.Provider>
}
