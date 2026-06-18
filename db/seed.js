// db/seed.js
// Populates the database with sample products and demo users for local testing.
// Run with: node db/seed.js   (after `npm run db:migrate`)
import { pool, closePool, withTransaction } from '../config/db.js';
import { hashPassword } from '../utils/password.js';

const PRODUCTS = [
  { name: 'Aurora Wireless Headphones', description: 'Over-ear ANC headphones with 40h battery.', price: 199.99, category: 'electronics', stock: 50, image_url: 'https://example.com/img/headphones.jpg' },
  { name: 'Nimbus Mechanical Keyboard',  description: 'Hot-swappable 75% keyboard, RGB.',        price: 129.0,  category: 'electronics', stock: 30, image_url: 'https://example.com/img/keyboard.jpg' },
  { name: 'Pulse Smartwatch 2',          description: 'AMOLED, GPS, SpO2 and heart-rate.',         price: 249.5,  category: 'electronics', stock: 0,  image_url: 'https://example.com/img/watch.jpg' },
  { name: 'Terra Stainless Bottle 1L',   description: 'Vacuum-insulated, keeps cold 24h.',         price: 24.99,  category: 'home',        stock: 200, image_url: 'https://example.com/img/bottle.jpg' },
  { name: 'Lumen Desk Lamp',             description: 'Dimmable LED lamp with USB-C charging.',    price: 39.95,  category: 'home',        stock: 75, image_url: 'https://example.com/img/lamp.jpg' },
  { name: 'Cloudstep Running Shoes',     description: 'Lightweight daily trainers.',               price: 89.0,   category: 'fashion',     stock: 120, image_url: 'https://example.com/img/shoes.jpg' },
  { name: 'Heritage Leather Wallet',     description: 'Full-grain leather bifold.',                price: 49.0,   category: 'fashion',     stock: 60, image_url: 'https://example.com/img/wallet.jpg' },
  { name: 'The Pragmatic Backend',       description: 'A hands-on guide to API design.',           price: 34.99,  category: 'books',       stock: 300, image_url: 'https://example.com/img/book1.jpg' },
  { name: 'PostgreSQL Deep Dive',        description: 'Indexing, transactions and tuning.',        price: 42.0,   category: 'books',       stock: 150, image_url: 'https://example.com/img/book2.jpg' },
  { name: 'Brew Master Pour-Over Kit',   description: 'Glass dripper, carafe and 100 filters.',    price: 59.99,  category: 'home',        stock: 40, image_url: 'https://example.com/img/coffee.jpg' },
];

async function seed() {
  await withTransaction(async (client) => {
    // Clean slate (CASCADE clears dependent rows). TRUNCATE … RESTART IDENTITY
    // resets the generated PK sequences too.
    await client.query(
      'TRUNCATE order_items, orders, cart_items, wishlists, products, users RESTART IDENTITY CASCADE',
    );

    // Demo users.
    const adminHash = await hashPassword('Admin123!');
    const customerHash = await hashPassword('Customer123!');
    await client.query(
      `INSERT INTO users (name, email, password_hash, role) VALUES
         ($1, $2, $3, 'admin'),
         ($4, $5, $6, 'customer')`,
      [
        'Site Admin', 'admin@example.com', adminHash,
        'Demo Customer', 'customer@example.com', customerHash,
      ],
    );

    // Products — one multi-row INSERT.
    const values = [];
    const placeholders = PRODUCTS.map((p, i) => {
      const b = i * 6;
      values.push(p.name, p.description, p.price, p.category, p.stock, p.image_url);
      return `($${b + 1}, $${b + 2}, $${b + 3}, $${b + 4}, $${b + 5}, $${b + 6})`;
    });
    await client.query(
      `INSERT INTO products (name, description, price, category, stock, image_url)
       VALUES ${placeholders.join(', ')}`,
      values,
    );
  });

  console.log('✅ Seed complete:');
  console.log(`   - ${PRODUCTS.length} products`);
  console.log('   - admin@example.com / Admin123!');
  console.log('   - customer@example.com / Customer123!');
}

export { seed };

// Run when invoked directly (node db/seed.js), but not when imported by tests.
if (process.argv[1] && process.argv[1].includes('seed')) {
  seed()
    .catch((err) => {
      console.error('❌ Seed failed:', err.message);
      process.exitCode = 1;
    })
    .finally(closePool);
}
