-- db/schema.sql
-- Idempotent DDL for the e-commerce API. Safe to run repeatedly.

-- Case-insensitive emails without manual LOWER() everywhere.
CREATE EXTENSION IF NOT EXISTS citext;
-- Trigram index support for fast ILIKE product-name search.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ─────────────────────────────────────────────────────────────
-- users
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id                       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name                     TEXT        NOT NULL,
    email                    CITEXT      NOT NULL UNIQUE,
    password_hash            TEXT        NOT NULL,
    role                     TEXT        NOT NULL DEFAULT 'customer'
                                         CHECK (role IN ('customer', 'admin')),
    reset_token_hash         TEXT,
    reset_token_expires_at   TIMESTAMPTZ,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- products
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name          TEXT          NOT NULL,
    description   TEXT          NOT NULL DEFAULT '',
    price         NUMERIC(10,2) NOT NULL CHECK (price >= 0),
    category      TEXT          NOT NULL,
    stock         INTEGER       NOT NULL DEFAULT 0 CHECK (stock >= 0),
    image_url     TEXT,
    is_active     BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products (category);
CREATE INDEX IF NOT EXISTS idx_products_price    ON products (price);
CREATE INDEX IF NOT EXISTS idx_products_active   ON products (is_active);
-- Trigram index accelerates `name ILIKE '%term%'` search.
CREATE INDEX IF NOT EXISTS idx_products_name_trgm
    ON products USING gin (name gin_trgm_ops);

-- ─────────────────────────────────────────────────────────────
-- wishlists
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wishlists (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id      BIGINT      NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
    product_id   BIGINT      NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_wishlists_user ON wishlists (user_id);

-- ─────────────────────────────────────────────────────────────
-- cart_items
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cart_items (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id      BIGINT      NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
    product_id   BIGINT      NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity     INTEGER     NOT NULL CHECK (quantity > 0),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_cart_items_user ON cart_items (user_id);

-- ─────────────────────────────────────────────────────────────
-- orders
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id        BIGINT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status         TEXT          NOT NULL DEFAULT 'pending'
                                 CHECK (status IN ('pending', 'paid', 'cancelled')),
    total_amount   NUMERIC(10,2) NOT NULL CHECK (total_amount >= 0),
    payment_ref    TEXT,
    created_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_user   ON orders (user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);

-- ─────────────────────────────────────────────────────────────
-- order_items
-- product_id uses ON DELETE RESTRICT so historical orders can't lose
-- their line items if a product is removed. price_at_purchase locks
-- the price paid, independent of later catalogue changes.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_items (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id            BIGINT        NOT NULL REFERENCES orders(id)   ON DELETE CASCADE,
    product_id          BIGINT        NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity            INTEGER       NOT NULL CHECK (quantity > 0),
    price_at_purchase   NUMERIC(10,2) NOT NULL CHECK (price_at_purchase >= 0),
    created_at          TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items (order_id);
