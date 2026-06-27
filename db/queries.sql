-- db/queries.sql
-- Handy read-only queries to inspect the e-commerce data.
-- Run in psql:   psql -U postgres -d ecommerce -f db/queries.sql
-- or paste individual queries into psql / pgAdmin.

-- ─────────────────────────────────────────────────────────────
-- Quick row counts for every table
-- ─────────────────────────────────────────────────────────────
SELECT 'users'       AS table, COUNT(*) FROM users
UNION ALL SELECT 'products',    COUNT(*) FROM products
UNION ALL SELECT 'wishlists',   COUNT(*) FROM wishlists
UNION ALL SELECT 'cart_items',  COUNT(*) FROM cart_items
UNION ALL SELECT 'orders',      COUNT(*) FROM orders
UNION ALL SELECT 'order_items', COUNT(*) FROM order_items;

-- ─────────────────────────────────────────────────────────────
-- USERS (never select password_hash in real life — shown safe cols)
-- ─────────────────────────────────────────────────────────────
SELECT id, name, email, role, created_at
FROM users
ORDER BY id;

-- ─────────────────────────────────────────────────────────────
-- PRODUCTS




-- ─────────────────────────────────────────────────────────────
SELECT id, name, price, category, stock, is_active
FROM products
ORDER BY id;

-- Only active products, cheapest first
SELECT id, name, price, stock
FROM products
WHERE is_active = TRUE
ORDER BY price ASC;

-- Products grouped by category
SELECT category, COUNT(*) AS num_products, SUM(stock) AS total_stock
FROM products
GROUP BY category
ORDER BY category;

-- ─────────────────────────────────────────────────────────────
-- WISHLISTS — who wishlisted what
-- ─────────────────────────────────────────────────────────────
SELECT u.email, p.name AS product, w.created_at AS added_at
FROM wishlists w
JOIN users u    ON u.id = w.user_id
JOIN products p ON p.id = w.product_id
ORDER BY u.email, w.created_at;

-- ─────────────────────────────────────────────────────────────
-- CART — line items + per-line and per-user totals
-- ─────────────────────────────────────────────────────────────
SELECT u.email,
       p.name AS product,
       c.quantity,
       p.price,
       (c.quantity * p.price) AS line_total
FROM cart_items c
JOIN users u    ON u.id = c.user_id
JOIN products p ON p.id = c.product_id
ORDER BY u.email, p.name;

-- Cart total per user
SELECT u.email, SUM(c.quantity * p.price) AS cart_total
FROM cart_items c
JOIN users u    ON u.id = c.user_id
JOIN products p ON p.id = c.product_id
GROUP BY u.email;

-- ─────────────────────────────────────────────────────────────
-- ORDERS — headers
-- ─────────────────────────────────────────────────────────────
SELECT o.id, u.email, o.status, o.total_amount, o.payment_ref, o.created_at
FROM orders o
JOIN users u ON u.id = o.user_id
ORDER BY o.created_at DESC;

-- ORDER ITEMS — full order detail with historical price
SELECT o.id AS order_id,
       u.email,
       o.status,
       p.name AS product,
       oi.quantity,
       oi.price_at_purchase,
       (oi.quantity * oi.price_at_purchase) AS line_total
FROM order_items oi
JOIN orders o   ON o.id = oi.order_id
JOIN users u    ON u.id = o.user_id
JOIN products p ON p.id = oi.product_id
ORDER BY o.id, p.name;

-- Revenue from PAID orders only
SELECT COALESCE(SUM(total_amount), 0) AS paid_revenue,
       COUNT(*)                       AS paid_orders
FROM orders
WHERE status = 'paid';

-- ─────────────────────────────────────────────────────────────
-- Schema introspection — list all tables / describe a table
-- ─────────────────────────────────────────────────────────────
-- All tables in the public schema:
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Columns of a specific table (change 'products'):
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'products'
ORDER BY ordinal_position;
