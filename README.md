# ShopHub

E-commerce nümunə tətbiqi — ShopHub
> Bu README repository-dəki faylların (xüsusilə `shophub-back` və `shophub-front`) analizinə əsaslanaraq hazırlanıb. Axtarış nəticələri məhdudiyyəti səbəbindən bəzi fayl və detalları qaçırmış ola bilər. Tam kodu və daha çox axtarışı burada görə bilərsiniz: https://github.com/MNIGARR/ShopHub

---

## Tez baxış (Overview)

ShopHub — Node.js/Express ilə yazılmış REST API (backend) və Vite + plain JavaScript + Tailwind istifadə edən yüngül frontend (HTML/JS/CSS) olan e-commerce tətbiq nümunəsidir. Backend MSSQL (mssql paketi) üzərindən verilənlər bazası ilə işləyir və JWT ilə autentifikasiya təmin edir. Frontend `index.html` + `src/js/app.js` əsasında SPA-oxşar idarəetmə ilə səhifələrə yönəlir.

Əsas qovluqlar:
- `shophub-back/` — backend server (Express, MSSQL)
- `shophub-front/` — frontend (Vite, HTML səhifələr, `src/js/app.js`)
- (Kökdə qısa README mövcud, amma bu sənəd daha ətraflıdır.)

---

## Texnologiyalar (Tech stack)

- Backend: Node.js, Express, mssql (Microsoft SQL Server client), bcryptjs, jsonwebtoken, dotenv
- Frontend: Vite, Plain JS (ES modules), HTML, Tailwind CSS
- Development tooling: nodemon (backend dev)
- Authentication: JWT
- Parol hash: bcryptjs
- E-poçt göndərmə (istifadə edilən util var: `sendEmail`)

Repo dil tərkibi: JavaScript ~64.6%, HTML ~34.7%, CSS ~0.7%

---

## Xüsusiyyətlər (Features)

- İstifadəçi qeydiyyatı / login (JWT)
- Parol unutma və sıfırlama (token əsasında)
- Məhsulların siyahısı, məhsul detallarının göstərilməsi
- Kateqoriyalar CRUD (admin)
- Sifarişlər — istifadəçinin öz sifarişləri, admin üçün sifarişlərin idarəsi
- İstifadəçi siyahısı və rola / aktivliyə nəzarət (admin)
- Sadə frontend UI: mağaza görünüşü, səbət (cart), məhsul səhifələri, checkout səhifəsi

---

## Struktur (ən vacib fayllar)

- shophub-back/
  - package.json (scripts: `dev` = nodemon, `start` = node)
  - src/
    - server.js — tətbiqi başladan fayl (DB pool bağlantısı qurur)
    - app.js — Express app, route mount-ları və global error middleware
    - config/db.js — `getPool()` funksiyası (mssql bağlantısı)
    - controllers/ — auth, products, categories, orders, users, və s.
    - routes/ — route faylları (`/api/auth`, `/api/products`, ...)
    - services/ — biznes məntiqi (məsələn auth.service)
    - utils/ — `AppError`, `sendEmail` (görünür email util mövcuddur)
- shophub-front/
  - package.json (vite)
  - index.html — əsas giriş səhifəsi, layout və `src/js/app.js` daxil edilir
  - src/
    - js/app.js — frontend məntiqinin böyük hissəsi (auth, products, cart, UI)
    - pages/ — müstəqil HTML səhifələr (cart.html, product-detail.html, checkout.html, auth səhifələri)
    - css/ — stil faylları (və Tailwind CDN istifadə olunur)
- README.md (kökdə qısa)

---

## Tələb olunanlar (Requirements)

- Node.js (v16+ tövsiyə olunur)
- npm / pnpm / yarn
- Microsoft SQL Server (və ya uyğun MSSQL instansiyası)
- Ətraf mühit dəyişənləri (aşağıda nümunə göstərilib)

---

## Ətraf mühit dəyişənləri (Environment)

Backend üçün `.env` nümunəsi (shophub-back/.env):
