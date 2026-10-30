import { extraProducts } from './extra-products.js'
import { moreProducts } from './more-products.js'
import { newProducts } from './new-products.js'

const image = (name) => `/images/${name}.jpg`

const sub = (items) => items.map(([id, label]) => ({ id, label }))

export const categories = [
  { id: 'mobile', label: 'موبایل', image: image('product-phone'), color: '#edf1ff', sub: sub([['phones', 'گوشی موبایل'], ['accessories', 'لوازم جانبی موبایل'], ['charging', 'شارژر و کابل'], ['cases', 'قاب و محافظ']]) },
  { id: 'digital', label: 'کالای دیجیتال', image: image('product-headphone'), color: '#e9f3f5', sub: sub([['headphones', 'هدفون و هندزفری'], ['laptops', 'لپ‌تاپ و کامپیوتر'], ['tablets', 'تبلت'], ['accessories', 'لوازم جانبی دیجیتال'], ['phones', 'گوشی موبایل'], ['gaming', 'کنسول و بازی']]) },
  { id: 'home', label: 'خانه و آشپزخانه', image: image('product-coffee'), color: '#f8eee9', sub: sub([['appliances', 'لوازم برقی خانگی'], ['kitchen', 'آشپزخانه'], ['decor', 'دکوراسیون'], ['serve', 'سرو و پذیرایی']]) },
  { id: 'fashion', label: 'مد و پوشاک', image: image('product-sneaker'), color: '#f4ebea', sub: sub([['women', 'پوشاک زنانه'], ['men', 'پوشاک مردانه'], ['shoes', 'کیف و کفش'], ['kids', 'پوشاک بچگانه']]) },
  { id: 'beauty', label: 'زیبایی و سلامت', image: image('product-skincare'), color: '#fff0f2', sub: sub([['skin', 'مراقبت پوست'], ['hair', 'مراقبت مو'], ['makeup', 'لوازم آرایشی'], ['perfume', 'عطر و ادکلن'], ['oral', 'بهداشت دهان و دندان'], ['body', 'بهداشت بدن']]) },
  { id: 'grocery', label: 'کالاهای سوپرمارکتی', image: image('product-grocery'), color: '#eef5e9', sub: sub([['foods', 'مواد غذایی'], ['drinks', 'نوشیدنی'], ['breakfast', 'صبحانه'], ['cleaning', 'شوینده و بهداشتی']]) },
  { id: 'watch', label: 'ساعت و اکسسوری', image: image('product-watch'), color: '#f3effa', sub: sub([['smart', 'ساعت هوشمند'], ['classic', 'ساعت مچی'], ['jewelry', 'زیورآلات'], ['accessories', 'اکسسوری']]) },
  { id: 'gaming', label: 'بازی و سرگرمی', image: image('product-console'), color: '#e9effc', sub: sub([['consoles', 'کنسول بازی'], ['games', 'بازی ویدیویی'], ['accessories', 'لوازم جانبی بازی'], ['toys', 'اسباب‌بازی']]) },
  { id: 'sports', label: 'ورزش و سفر', image: image('product-sneaker'), color: '#eef4ef', sub: sub([['apparel', 'پوشاک ورزشی'], ['shoes', 'کفش ورزشی'], ['travel', 'سفر و کمپینگ'], ['equipment', 'تجهیزات ورزشی']]) },
  { id: 'kids', label: 'مادر و کودک', image: image('product-baby'), color: '#fff3e9', sub: sub([['hygiene', 'بهداشت کودک'], ['clothes', 'پوشاک کودک'], ['toys', 'اسباب‌بازی'], ['infant', 'لوازم نوزاد']]) },
  { id: 'books', label: 'کتاب و لوازم تحریر', image: '/images/product-notebook.svg', color: '#f5f0e6', sub: sub([['books', 'کتاب'], ['notebooks', 'دفتر و کاغذ'], ['stationery', 'نوشت‌افزار'], ['art', 'لوازم هنری']]) },
  { id: 'vehicle', label: 'خودرو و ابزار', image: image('product-drill'), color: '#edf0f3', sub: sub([['auto', 'لوازم خودرو'], ['tools', 'ابزار دستی'], ['power', 'ابزار برقی'], ['safety', 'تجهیزات ایمنی']]) },
  { id: 'gifts', label: 'پک‌های هدیه', image: image('product-accessory-set'), color: '#f6ecf6', sub: sub([['beauty', 'هدیه زیبایی'], ['accessories', 'هدیه اکسسوری'], ['kids', 'هدیه کودک'], ['home', 'هدیه خانه']]) },
  { id: 'computer', label: 'کامپیوتر و تجهیزات جانبی', image: image('product-workspace-set'), color: '#e9f4ff', sub: sub([['laptops', 'لپ‌تاپ'], ['monitors', 'مانیتور'], ['peripherals', 'کیبورد و ماوس'], ['network', 'تجهیزات شبکه']]) },
  { id: 'pets', label: 'حیوانات خانگی', image: image('product-pet-set'), color: '#fff3e9', sub: sub([['food', 'غذای حیوانات'], ['essentials', 'ظرف و لوازم نگهداری'], ['toys', 'اسباب‌بازی حیوانات'], ['grooming', 'بهداشت و نظافت']]) },
  { id: 'garden', label: 'گل، گیاه و باغبانی', image: image('product-garden-set'), color: '#eaf5ec', sub: sub([['plants', 'گیاه آپارتمانی'], ['pots', 'گلدان و کاشت'], ['tools', 'ابزار باغبانی'], ['watering', 'آبیاری']]) },
  { id: 'music', label: 'ساز و تجهیزات موسیقی', image: image('product-music-set'), color: '#f5edff', sub: sub([['strings', 'سازهای زهی'], ['keyboards', 'سازهای کلاویه‌ای'], ['percussion', 'سازهای کوبه‌ای'], ['accessories', 'لوازم موسیقی']]) },
  { id: 'handmade', label: 'هنر و صنایع دستی', image: image('product-handmade-set'), color: '#fff1ea', sub: sub([['ceramics', 'سفال و سرامیک'], ['textiles', 'بافته‌های تزئینی'], ['wood', 'محصولات چوبی'], ['gifts', 'هدیه هنری']]) },
  { id: 'bed-bath', label: 'کالای خواب و حمام', image: image('product-bedroom-set'), color: '#edf6ff', sub: sub([['bedding', 'لحاف و روتختی'], ['pillows', 'بالش و لوازم خواب'], ['towels', 'حوله حمام'], ['organizers', 'سبد و نظم‌دهنده'], ['accessories', 'لوازم کنار تخت']]) },
  { id: 'lighting', label: 'روشنایی و نورپردازی', image: image('product-lighting-set'), color: '#fff7e8', sub: sub([['desk', 'چراغ مطالعه'], ['bulbs', 'لامپ'], ['night', 'چراغ خواب'], ['decorative', 'نور تزئینی']]) },
  { id: 'office', label: 'لوازم اداری و میز کار', image: image('product-office-set'), color: '#edf3fc', sub: sub([['stationery', 'دفتر و یادداشت'], ['filing', 'پوشه و بایگانی'], ['organization', 'نظم‌دهنده میز'], ['tools', 'ابزار اداری'], ['workspace', 'تجهیزات میز کار']]) },
  { id: 'party', label: 'جشن و مهمانی', image: image('product-party-set'), color: '#fff0f1', sub: sub([['balloons', 'بادکنک'], ['tableware', 'ظروف مهمانی'], ['decor', 'تزئینات جشن'], ['giftwrap', 'بسته‌بندی هدیه']]) },
  { id: 'cleaning', label: 'نظافت و شست‌وشو', image: image('product-cleaning-set'), color: '#ecf7f7', sub: sub([['cleaners', 'شوینده و پاک‌کننده'], ['cloths', 'دستمال نظافت'], ['tools', 'ابزار شست‌وشو'], ['gloves', 'دستکش نظافت']]) },
]

// Product data, prices and inventory are illustrative and do not represent a real store.
const originalProducts = [
  {
    id: 'phone-pro', title: 'گوشی موبایل مدل K1 Pro ظرفیت ۲۵۶ گیگابایت', image: image('product-phone'), categories: ['mobile', 'digital'],
    price: 18990000, oldPrice: 22900000, discount: 17, rating: '۴.۷', reviews: 214, sold: 78, badge: 'پرفروش',
    features: ['حافظه داخلی ۲۵۶ گیگابایت', 'نمایشگر باکیفیت و دوربین سه‌گانه', 'مناسب استفاده روزمره']
  },
  {
    id: 'earbuds', title: 'هندزفری بلوتوثی مدل AirSound Pro', image: image('product-earbuds'), categories: ['digital', 'mobile'],
    price: 1290000, oldPrice: 1720000, discount: 25, rating: '۴.۶', reviews: 186, sold: 64, badge: 'ارسال سریع',
    features: ['اتصال بی‌سیم پایدار', 'محفظه شارژ همراه', 'طراحی سبک و راحت']
  },
  {
    id: 'headphone', title: 'هدفون بی‌سیم مدل Studio X با حذف نویز', image: image('product-headphone'), categories: ['digital'],
    price: 2390000, oldPrice: 3490000, discount: 32, rating: '۴.۸', reviews: 98, sold: 82, badge: 'محبوب',
    features: ['صدای شفاف و فراگیر', 'طراحی دورگوشی راحت', 'اتصال بلوتوث']
  },
  {
    id: 'watch', title: 'ساعت هوشمند مدل Active Pro بند سیلیکونی', image: image('product-watch'), categories: ['watch', 'digital', 'sports'],
    price: 1790000, oldPrice: 2390000, discount: 25, rating: '۴.۵', reviews: 125, sold: 53, badge: 'پیشنهاد کارن',
    features: ['پایش فعالیت روزانه', 'نمایشگر رنگی', 'بند سیلیکونی نرم']
  },
  {
    id: 'cream', title: 'کرم مرطوب‌کننده و آبرسان پوست حجم ۲۰۰ میلی‌لیتر', image: image('product-skincare'), categories: ['beauty'],
    price: 389000, oldPrice: 648000, discount: 40, rating: '۴.۷', reviews: 312, sold: 91, badge: 'پرفروش',
    features: ['آبرسانی روزانه پوست', 'مناسب انواع پوست', 'بافت سبک']
  },
  {
    id: 'sneaker', title: 'کفش پیاده‌روی روزمره مدل Comfort رنگ کرم', image: image('product-sneaker'), categories: ['fashion', 'sports'],
    price: 1490000, oldPrice: 2120000, discount: 30, rating: '۴.۶', reviews: 76, sold: 67, badge: 'منتخب',
    features: ['طراحی سبک و راحت', 'مناسب پیاده‌روی روزانه', 'رنگ کرم']
  },
  {
    id: 'coffee', title: 'اسپرسوساز دلونگی مدل Dedica رنگ استیل', image: image('product-coffee'), categories: ['home'],
    price: 19890000, oldPrice: 24800000, discount: 20, rating: '۴.۸', reviews: 89, sold: 41, badge: 'ارسال سریع',
    features: ['بدنه استیل', 'مناسب تهیه قهوه و اسپرسو', 'طراحی کم‌جا']
  },
  {
    id: 'samsung', title: 'گوشی موبایل سامسونگ مدل Galaxy A55 ظرفیت ۲۵۶ گیگابایت', image: image('product-samsung'), categories: ['mobile', 'digital'],
    price: 21990000, oldPrice: 24990000, discount: 12, rating: '۴.۷', reviews: 153, sold: 72, badge: 'محبوب',
    features: ['حافظه داخلی ۲۵۶ گیگابایت', 'صفحه نمایش باکیفیت', 'مناسب استفاده روزمره']
  },
  {
    id: 'console', title: 'کنسول بازی سونی مدل PlayStation 5', image: image('product-console'), categories: ['gaming', 'digital'],
    price: 32990000, oldPrice: 36990000, discount: 11, rating: '۴.۹', reviews: 243, sold: 61, badge: 'پرفروش',
    features: ['کنسول بازی خانگی', 'همراه با دسته بی‌سیم', 'مناسب بازی و سرگرمی']
  },
  {
    id: 'honey', title: 'عسل طبیعی چند گیاه مقدار ۵۰۰ گرم', image: image('product-grocery'), categories: ['grocery'],
    price: 245000, oldPrice: 320000, discount: 23, rating: '۴.۶', reviews: 73, sold: 55, badge: 'تازه',
    features: ['مناسب صبحانه', 'بسته‌بندی شیشه‌ای', 'وزن ۵۰۰ گرم']
  },
  {
    id: 'fryer', title: 'سرخ‌کن بدون روغن فیلیپس مدل دیجیتال', image: image('product-fryer'), categories: ['home'],
    price: 8990000, oldPrice: 10990000, discount: 18, rating: '۴.۷', reviews: 104, sold: 62, badge: 'منتخب',
    features: ['پخت با روغن کمتر', 'صفحه نمایش دیجیتال', 'مناسب آشپزخانه']
  },
  {
    id: 'pasta', title: 'ماکارونی اسپاگتی باریلا بسته ۴۵۴ گرمی', image: image('product-pasta'), categories: ['grocery'],
    price: 159000, oldPrice: 199000, discount: 20, rating: '۴.۶', reviews: 66, sold: 58, badge: 'پیشنهاد کارن',
    features: ['ماکارونی رشته‌ای', 'مناسب تهیه انواع پاستا', 'بسته ۴۵۴ گرمی']
  },
  {
    id: 'baby', title: 'پوشک و دستمال مرطوب کودک پمپرز', image: image('product-baby'), categories: ['kids', 'grocery'],
    price: 745000, oldPrice: 955000, discount: 22, rating: '۴.۷', reviews: 83, sold: 49, badge: 'منتخب',
    features: ['مناسب مراقبت از کودک', 'همراه با دستمال مرطوب', 'بسته‌بندی بهداشتی']
  },
  {
    id: 'notebook', title: 'دفتر یادداشت جلد سخت مدل روزانه', image: '/images/product-notebook.svg', categories: ['books', 'office'],
    price: 189000, oldPrice: 249000, discount: 24, rating: '۴.۵', reviews: 45, sold: 39, badge: 'پیشنهاد کارن',
    features: ['جلد سخت و بادوام', 'مناسب یادداشت‌های روزانه', 'طراحی ساده و کاربردی']
  },
  {
    id: 'drill', title: 'دریل پیچ‌گوشتی شارژی بوش مدل GSR 120-LI', image: image('product-drill'), categories: ['vehicle'],
    price: 5490000, oldPrice: 6690000, discount: 18, rating: '۴.۷', reviews: 54, sold: 47, badge: 'محبوب',
    features: ['طراحی شارژی', 'مناسب کارهای خانگی', 'کاربری ساده و سبک']
  },
]

// Each product can belong to several subcategories; category IDs remain backward-compatible.
const originalSubcategories = {
  'phone-pro': { mobile: ['phones'], digital: ['phones'] },
  earbuds: { mobile: ['accessories'], digital: ['headphones'] },
  headphone: { digital: ['headphones'] },
  watch: { watch: ['smart'], digital: ['accessories'], sports: ['equipment'] },
  cream: { beauty: ['skin'] },
  sneaker: { fashion: ['shoes'], sports: ['shoes'] },
  coffee: { home: ['appliances'] },
  samsung: { mobile: ['phones'], digital: ['phones'] },
  console: { gaming: ['consoles'], digital: ['gaming'] },
  honey: { grocery: ['foods', 'breakfast'] },
  fryer: { home: ['appliances'] },
  pasta: { grocery: ['foods'] },
  baby: { kids: ['hygiene'], grocery: ['cleaning'] },
  notebook: { books: ['notebooks'], office: ['stationery'] },
  drill: { vehicle: ['power'] },
}

export const products = [
  ...originalProducts.map((product) => ({ ...product, subcategories: originalSubcategories[product.id] })),
  ...extraProducts,
  ...moreProducts,
  ...newProducts,
]

export const slides = [
  { image: image('hero-reference'), theme: 'reference', eyebrow: 'خریدی آسان، با اطمینان کامل', title: 'همه‌چیز،', title2: 'در یک فروشگاه!', description: 'از جدیدترین گوشی‌ها و لوازم دیجیتال گرفته تا لوازم خانه، مد و زیبایی؛ هر چیزی که نیاز داری، در دیجی‌کارن پیدا می‌کنی.', cta: 'مشاهده محصولات', target: 'all' },
  { image: image('hero-shopping'), theme: 'red', eyebrow: 'دنیایی از انتخاب‌های خوب', title: 'خرید خوب،', title2: 'حال خوب!', description: 'هر چیزی که دوست داری، همین‌جا منتظرته.', cta: 'کشف پیشنهادها', target: 'deals', note: 'تا ۴۰٪ تخفیف' },
  { image: image('promo-tech'), theme: 'blue', eyebrow: 'برای زندگی هوشمندتر', title: 'تکنولوژی،', title2: 'کنار تو!', description: 'دنیای دیجیتال رو با انتخاب‌های تازه کشف کن.', cta: 'مشاهده کالای دیجیتال', target: 'digital', note: 'انتخاب‌های جذاب' },
  { image: image('promo-beauty'), theme: 'beauty', eyebrow: 'یه حال خوب برای خودت', title: 'زیبایی،', title2: 'از تو شروع می‌شه!', description: 'برای لحظه‌هایی که به خودت اهمیت می‌دی.', cta: 'مشاهده محصولات', target: 'beauty', note: 'زیبایی و سلامت' },
]
