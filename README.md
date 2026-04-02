# ShopHub

Salam! Bu repository-də mənim hazırladığım **ShopHub** adlı full‑stack e‑commerce (onlayn mağaza) nümunə layihəsi var. Layihəni iki hissəyə bölüb yazmışam:

- **Backend:** `shophub-back/` — Node.js + Express ilə yazdığım REST API
- **Frontend:** `shophub-front/` — Vite + plain JavaScript + HTML/CSS ilə qurduğum sadə UI

Repo dili əsasən: **JavaScript (~65%)**, **HTML (~31%)**, **CSS (~3%)**

---

## Layihə nə edir?

ShopHub-da məqsədim klassik bir e‑commerce axınını end-to-end göstərmək idi:

- istifadəçi qeydiyyatı/girişi,
- məhsullara baxış və məhsul detail,
- səbət (cart) məntiqi,
- checkout / sifariş axını,
- admin tərəfdə isə kateqoriya, məhsul, sifariş və istifadəçi idarəetməsi üçün API.

Frontend tərəfdə framework istifadə etmədən (plain JS) işləyən bir məntiq qurmağa çalışmışam, backend tərəfdə isə route-ları bölüb daha səliqəli API strukturu yaratmışam.

---

## Əsas funksiyalar (Features)

### İstifadəçi tərəfi
- Qeydiyyat və login (JWT)
- Məhsulların siyahısı və məhsul detalları
- Səbət (cart) funksionallığı
- Checkout / sifariş axını
- İstifadəçinin öz sifarişlərinə baxış (API)

### Admin tərəfi (API səviyyəsində)
- Kateqoriya CRUD
- Məhsul CRUD
- Sifarişlərin idarəsi
- İstifadəçilərin idarəsi

---

## Backend (shophub-back)

Backend-i Express üzərində REST API kimi yazmışam.

### Route-lar
`shophub-back/src/app.js` faylında mount etdiyim əsas route-lar:

- `/api/auth`
- `/api/categories`
- `/api/products`
- `/api/orders`
- `/api/users`

Texniki endpoint-lər:
- `GET /health` — servis sağlamlıq yoxlaması
- `GET /` — servis haqqında qısa info

### Entry point
Backend server `shophub-back/src/server.js` faylından qalxır.

- Default port: **5000** (`PORT` env olmasa)
- Server start olmamışdan əvvəl DB-ə connect olmağa çalışır.

### DB (MSSQL)
DB bağlantısı `shophub-back/src/config/db.js` faylında `mssql` ilə qurulub və `getPool()` vasitəsilə pool idarə olunur.

> Qeyd: `package.json`-da `mysql2` dependency də var, amma hazırkı konfiqurasiya `mssql` (Microsoft SQL Server) üzərindədir.

### Backend-i işə salmaq
```bash
cd shophub-back
npm install
npm run dev
```

Backend bu env dəyişənlərini gözləyir:
- `DB_USER`
- `DB_PASSWORD`
- `DB_SERVER`
- `DB_PORT` (default 1433)
- `DB_NAME`
- `PORT` (default 5000)
- `JWT_SECRET`
- `CORS_ORIGIN` (comma-separated frontend domain-lar)
- `FRONTEND_BASE_URL` (şifrə sıfırlama linkləri üçün)

Env nümunəsi:
- `shophub-back/.env.example`

---

## Frontend (shophub-front)

Frontend-i Vite ilə qaldırıram və plain JavaScript ilə UI məntiqini idarə etmişəm.

### Frontend-i işə salmaq
```bash
cd shophub-front
npm install
npm run dev
```
Frontend API bazası env ilə idarə olunur:
- `VITE_API_BASE` (məs: `https://your-backend-domain/api`)

Env nümunəsi:
- `shophub-front/.env.example`

---

## Repo strukturu (qısa)
- `shophub-back/`
  - `src/server.js` — server start + DB connect
  - `src/app.js` — middleware + route-lar + error handling
  - `src/config/db.js` — MSSQL pool config
- `shophub-front/`
  - `index.html`
  - `src/js/` — əsas frontend JS məntiqi
  - `src/pages/` — əlavə HTML səhifələr (cart/checkout/auth və s.)

---

## Mənim etdiklərim (Implementation highlights)
Bu layihədə əsas fokusum:
- Backend-i səliqəli REST API strukturu ilə qurmaq (routes/controllers/services yanaşması)
- JWT ilə autentifikasiya axınını qurmaq
- DB bağlantısını pool məntiqi ilə mərkəzləşdirmək (`getPool()`)
- Frontend-də framework istifadə etmədən məhsul → səbət → checkout kimi axını işlək saxlamaq
- Lokal development üçün rahat skriptlər yazmaq (`nodemon`, `vite`)

---

## Növbəti addımlar (istəsəm əlavə edəcəyəm)
- `shophub-back/.env.example` əlavə etmək (real dəyərlərsiz)
- API üçün Postman collection və ya Swagger dokumentasiyası
- Docker ilə (DB + backend + frontend) bir komanda ilə qaldırma

---

## Deploy qeydləri (backend frontendlə birlikdə işləsin deyə)

Bu repo monorepo kimidir, amma iki ayrı app var:
- Backend servis root: `shophub-back/`
- Frontend servis root: `shophub-front/`

Deploy zamanı bunları ayrı servis kimi qaldırın:

1. Backend-i `shophub-back` qovluğundan deploy edin.
2. Backend env-ləri doldurun (`.env.example`-ə baxın).
3. Backend URL-də `GET /health` endpoint-ini yoxlayın.
4. Frontend-i `shophub-front` qovluğundan deploy edin.
5. Frontend build env-də `VITE_API_BASE=https://<backend-domain>/api` verin.
6. Backend-də `CORS_ORIGIN`-a frontend domain-ini əlavə edin.
7. Frontend-i yenidən deploy edin və login/products/checkout axınını test edin.
