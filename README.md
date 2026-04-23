A full-stack e-commerce reference project with a **Node.js/Express REST API** and a **Vite + vanilla JavaScript frontend**.

- **Backend:** `shophub-back/` — Node.js + Express ilə yazdığım REST API
- **Frontend:** `shophub-front/` — Vite + plain JavaScript + HTML/CSS ilə qurduğum sadə UI
ShopHub demonstrates a complete shopping flow (authentication, product browsing, cart, checkout, order history) and includes an admin area for managing products, categories, users, and orders.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Core Features](#core-features)
- [Tech Stack](#tech-stack)
- [Repository Structure](#repository-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [1) Backend Setup](#1-backend-setup)
  - [2) Frontend Setup](#2-frontend-setup)
- [Environment Variables](#environment-variables)
  - [Backend Environment](#backend-environment)
  - [Frontend Environment](#frontend-environment)
- [API Overview](#api-overview)
- [Authentication & Authorization](#authentication--authorization)
- [Checkout and Stock Safety](#checkout-and-stock-safety)
- [Email / Password Reset Notes](#email--password-reset-notes)
- [Development Notes](#development-notes)
- [Deployment Notes](#deployment-notes)
- [Known Limitations](#known-limitations)
- [Roadmap](#roadmap)

---

## Overview

ShopHub is organized as a monorepo with two standalone applications:

- **Backend**: `shophub-back/`  
  Express API with JWT authentication and Microsoft SQL Server integration.
- **Frontend**: `shophub-front/`  
  Multi-page, vanilla JS storefront and admin dashboard served via Vite.

The project is suitable for:

- learning full-stack e-commerce architecture,
- bootstrapping a small store MVP,
- practicing role-based access control and order lifecycle logic.

---

## Architecture

### Backend (Express API)

- Entry point: `src/server.js`
- App composition and middleware: `src/app.js`
- Route modules under `src/routes/`
- Business logic under `src/controllers/`
- MSSQL connection pooling under `src/config/db.js`


### Frontend (Vite + Vanilla JS)

- Multi-page HTML app under `src/pages/`
- API client and endpoint mapping under `src/js/api/`
- Domain services under `src/js/services/`
- UI modules under `src/js/ui/`
- Admin-specific modules under `src/js/admin/`

---

## Core Features

### Customer features

- User registration and login with JWT.
- Product listing with filtering, search, sorting, and pagination.
- Product detail view with image support.
- Client-side cart persistence (localStorage).
- Checkout flow that creates orders through API.
- “My Orders” view for authenticated users.
- Forgot/reset password flow.

### Admin features

- Category CRUD.
- Product CRUD.
- Order listing and status updates (`pending`, `paid`, `shipped`, `delivered`, `cancelled`).
- User management (activate/deactivate, role update).

---

## Tech Stack


### Backend

- Node.js
- Express 5
- MSSQL driver (`mssql`)
- JWT (`jsonwebtoken`)
- Password hashing (`bcryptjs`)
- CORS + dotenv
- Optional SMTP sending via `nodemailer` (loaded dynamically)

### Frontend

- Vite
- Vanilla JavaScript (module-based)
- HTML/CSS (multi-page UI)

---

## Repository Structure

```text
.
├── README.md
├── shophub-back/
│   ├── package.json
│   └── src/
│       ├── app.js
│       ├── server.js
│       ├── config/
│       ├── controllers/
│       ├── middleware/
│       ├── routes/
│       ├── services/
│       └── utils/
└── shophub-front/
    ├── package.json
    ├── index.html
    └── src/
        ├── pages/
        ├── js/
        ├── css/
        └── assets/
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- Microsoft SQL Server instance reachable by the backend

> **Important**: This repository currently does **not** include SQL schema/migration files. You need an existing ShopHub-compatible schema (tables such as `Users`, `Products`, `Categories`, `Orders`, `OrderItems`, `ProductImages`).

### 1) Backend Setup

```bash
cd shophub-back
npm install
npm run dev
```

By default, the backend runs on:

- `http://localhost:5000`
- Health check: `GET /health`
- API base: `http://localhost:5000/api`

### 2) Frontend Setup

```bash
cd shophub-front
npm install
npm run dev
```

Vite will print the local dev URL (commonly `http://localhost:5173`).

---

## Environment Variables

## Backend Environment

Create `shophub-back/.env`:

```bash
# Server
PORT=5000
NODE_ENV=development

# Database (MSSQL)
DB_USER=sa
DB_PASSWORD=your_password
DB_SERVER=localhost
DB_PORT=1433
DB_NAME=ShopHub

# Auth
JWT_SECRET=change_this_secret

# CORS
# Comma-separated; leave empty to allow all origins
CORS_ORIGIN=http://localhost:5173

# Password reset behavior
RESET_CODE_TTL_SECONDS=110
ALLOW_SIMPLE_RESET=true
FRONTEND_BASE_URL=http://localhost:5173

# SMTP (optional; needed for real reset email sending)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=mailer@example.com
SMTP_PASS=mailer_password
SMTP_FROM=ShopHub <mailer@example.com>
```

## Frontend Environment

Create `shophub-front/.env`:

```bash
VITE_API_BASE=http://localhost:5000/api
```

---

## API Overview

Base prefix: `/api`

### Auth

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me` (auth required)
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `POST /auth/reset-password-simple` (development / explicitly enabled only)

### Products

- `GET /products`
- `GET /products/:id`
- `POST /products` (admin)
- `PUT /products/:id` (admin)
- `DELETE /products/:id` (admin)

### Categories

- `GET /categories`
- `POST /categories` (admin)
- `PUT /categories/:id` (admin)
- `DELETE /categories/:id` (admin)

### Orders

- `GET /orders/my` (authenticated user)
- `GET /orders/:id` (owner or admin)
- `POST /orders/checkout` (authenticated user)
- `GET /orders` (admin)
- `PATCH /orders/:id/status` (admin)

### Users

- `GET /users` (admin)
- `PATCH /users/:id/active` (admin)
- `PATCH /users/:id/role` (admin)
- `DELETE /users/me` (authenticated user)

---

## Authentication & Authorization

- API uses `Authorization: Bearer <token>`.
- JWT is validated in middleware.
- Admin-only endpoints require role `admin`.
- 401 responses trigger frontend logout in the API helper.

---

## Checkout and Stock Safety

Checkout is implemented as a SQL transaction:

- locks selected products for stock consistency,
- validates stock before insertion,
- inserts `Orders` + `OrderItems`,
- decrements product stock atomically,
- commits only on complete success.

This helps prevent race conditions in concurrent checkout scenarios.

---

## Email / Password Reset Notes

The project supports two reset flows:

1. **Code-based reset** (`forgot-password` + `reset-password`) using `Users.ResetCode` and `Users.ResetCodeExpiry`.
2. **Simple reset endpoint** (`reset-password-simple`) intended only for development or controlled setups.

Email sending is best-effort:

- If SMTP environment variables are missing, email dispatch is skipped with a warning.
- If `nodemailer` is not installed, sending is skipped with a warning.

---

## Development Notes

- Backend is CommonJS and runs with `nodemon` in dev mode.
- Frontend uses modular ES imports and localStorage-backed state for auth/cart.
- `mysql2` exists in backend dependencies but active DB integration is MSSQL.

---

## Deployment Notes

Deploy as **two separate services**:

1. Deploy backend from `shophub-back/`.
2. Configure backend env vars and verify `GET /health`.
3. Deploy frontend from `shophub-front/`.
4. Set frontend `VITE_API_BASE` to backend `/api` URL.
5. Add frontend origin to backend `CORS_ORIGIN`.

---

## Known Limitations

- No DB migrations/schema scripts are included in-repo.
- No automated tests are currently configured.
- Some response messages/logs are localized and mixed-language.
- Optional `nodemailer` package is not listed in backend dependencies by default.

---

## Roadmap

Recommended next improvements:

- Add SQL migrations and seed data.
- Add OpenAPI/Swagger documentation.
- Add automated test suites (unit + integration).
- Add Docker Compose for local full-stack bootstrapping.
- Add CI checks (lint/test/build).

---

If you want, I can also generate:

- a matching **database schema SQL file**,
- a **Postman collection**,
- and a **Docker Compose** setup for one-command local startup.
