# استقرار رایگان روی HTTPS
برنامه یک سایت استاتیک است. **index.html را مستقیم از حافظهٔ گوشی باز نکنید** (دوربین، Service Worker و PWA به HTTPS نیاز دارند). ZIP را استخراج کنید و محتوای پوشه را (با زیرپوشه‌ها) آپلود کنید.

## گزینه ۱: GitHub Pages
۱) github.com ← New repository (Public). ۲) Add file ← Upload files: همهٔ فایل‌ها و پوشه‌ها. ۳) Settings ← Pages ← Deploy from a branch ← main / root ← Save. ۴) پس از حدود یک دقیقه آدرس https://نام‌کاربری.github.io/نام‌مخزن/ فعال می‌شود.
## گزینه ۲: Netlify Drop
app.netlify.com/drop ← پوشهٔ استخراج‌شده را رها کنید ← آدرس HTTPS می‌گیرید (روی گوشی شاید لازم باشد Chrome را روی «نسخهٔ دسکتاپ» بگذارید).
## گزینه ۳: Cloudflare Pages یا Vercel
پروژهٔ استاتیک بدون build؛ پوشهٔ خروجی = ریشه.

## نصب و به‌روزرسانی
Chrome اندروید ← باز کردن آدرس ← ⋮ ← Add to Home screen / Install app. اولین بار آنلاین باز کنید تا فایل‌ها ذخیره شوند.
برای نسخهٔ جدید، نام کش را در sw.js (hw-v4) تغییر دهید یا از «تنظیمات ← پاک‌کردن حافظهٔ آفلاین» استفاده کنید.
