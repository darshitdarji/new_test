# E-commerce REST API

A production-ready, modular e-commerce backend built with **Node.js (ES Modules) + Express + PostgreSQL**.
Authentication uses **JWT + bcryptjs**; validation uses **zod**; data access uses the raw
**`pg` Pool** with parameterized queries (no ORM) for full control over SQL and transactions.

## Features

- **Auth** — signup, login, forgot-password (mock email), reset-password.
- **Products** — public list (pagination / category & price filters / name search / sort) and detail; admin-only CRUD.
- **Wishlist** — add (idempotent), remove, view. *(protected)*
- **Cart** — add (increments quantity), update/remove, view with a dynamically calculated total. *(protected)*
- **Checkout & Payment** — transactional checkout that validates live stock and creates a `pending` order; a mock payment callback that marks the order `paid`, decrements stock, and clears the cart. *(protected)*
- **Security** — Helmet, CORS allowlist, global + per-auth rate limiting, zod input validation, parameterized SQL, no user-enumeration on auth, JWT expiry, configurable bcrypt cost.

## Project structure

```
config/       env.js (validated env), db.js (pg Pool + transaction helpers)
db/           schema.sql (DDL), migrate.js (apply schema), seed.js (sample data)
models/       *.model.js — all SQL, returns plain rows
controllers/  request handlers (business logic)
middleware/   authMiddleware.js, validate.js, errorMiddleware.js, notFound.js
routes/       per-module routers + index.js (mounts /api/v1)
validators/   zod schemas per module
utils/        token, password, pagination, ApiError, asyncHandler, response
tests/        Vitest + Supertest integration suites
app.js        Express app (exported, no listen)
server.js     entry point (listen + graceful shutdown)
```

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env          # then set a real JWT_SECRET and DB credentials

# 3. Create schema + sample data (PostgreSQL must be running)
npm run db:migrate
npm run db:seed

# 4. Run
npm run dev                   # http://localhost:4000
```

Seeded logins: `admin@example.com / Admin123!` and `customer@example.com / Customer123!`.

## Testing

```bash
npm test
```

The suite spins up an isolated `ecommerce_test` database (created automatically),
applies the schema, and exercises auth, products + admin role enforcement, cart,
wishlist, and the full checkout → payment flow via Supertest.

For manual testing, open [`requests.http`](requests.http) in VS Code (REST Client) or IntelliJ.

## API overview (base path `/api/v1`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/signup` | – | Register, returns JWT |
| POST | `/auth/login` | – | Login, returns JWT |
| POST | `/auth/forgot-password` | – | Issue reset token (mock email) |
| POST | `/auth/reset-password` | – | Consume reset token |
| GET | `/products` | – | List (filter/search/sort/paginate) |
| GET | `/products/:id` | – | Product detail |
| POST | `/products` | admin | Create product |
| PUT | `/products/:id` | admin | Update product |
| DELETE | `/products/:id` | admin | Delete product |
| GET | `/wishlist` | user | View wishlist |
| POST | `/wishlist` | user | Add to wishlist |
| DELETE | `/wishlist/:productId` | user | Remove from wishlist |
| GET | `/cart` | user | View cart + total |
| POST | `/cart` | user | Add / increment |
| PATCH | `/cart/:productId` | user | Set quantity (0 = remove) |
| DELETE | `/cart/:productId` | user | Remove line |
| POST | `/orders/checkout` | user | Create pending order |
| POST | `/orders/:id/confirm-payment` | user | Mock payment → paid |
| GET | `/orders` | user | List own orders |
| GET | `/orders/:id` | user | Own order detail |

All responses use a consistent envelope: `{ "success": true, "data": ..., "meta"?: ... }`
on success and `{ "success": false, "error": { "message", "details"? } }` on failure.
