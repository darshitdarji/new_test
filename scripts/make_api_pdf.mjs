// scripts/make_api_pdf.mjs
// Generates docs/API_Reference.pdf using pdfkit (no project dependency added).
// Run: node scripts/make_api_pdf.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import PDFDocument from 'pdfkit';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '..', 'docs');
fs.mkdirSync(outDir, { recursive: true });
const OUT = path.join(outDir, 'API_Reference.pdf');

const BASE = 'http://localhost:4000/api/v1';

// Palette
const NAVY = '#1f2d3d';
const BLUE = '#2563eb';
const GREY = '#6b7280';
const LIGHT = '#eef2f7';
const BORDER = '#d1d9e6';
const METHOD = { GET: '#16a34a', POST: '#2563eb', PUT: '#d97706', PATCH: '#7c3aed', DELETE: '#dc2626' };
const AUTHC = { Public: '#16a34a', User: '#2563eb', Admin: '#dc2626' };

const SECTIONS = [
  ['Authentication', [
    ['POST', '/auth/signup', 'Public', '{ name, email, password }'],
    ['POST', '/auth/login', 'Public', '{ email, password }'],
    ['POST', '/auth/forgot-password', 'Public', '{ email }  — reset token logged to server console'],
    ['POST', '/auth/reset-password', 'Public', '{ token, password }'],
  ]],
  ['Products', [
    ['GET', '/products', 'Public', 'query: page, limit, category, minPrice, maxPrice, q, sort (created_at|price|name), order (asc|desc)'],
    ['GET', '/products/:id', 'Public', '—'],
    ['POST', '/products', 'Admin', '{ name, price, category, stock?, description?, image_url? }'],
    ['PUT', '/products/:id', 'Admin', 'any subset of product fields'],
    ['DELETE', '/products/:id', 'Admin', '—'],
  ]],
  ['Wishlist  (protected)', [
    ['GET', '/wishlist', 'User', '—'],
    ['POST', '/wishlist', 'User', '{ productId }'],
    ['DELETE', '/wishlist/:productId', 'User', '—'],
  ]],
  ['Shopping Cart  (protected)', [
    ['GET', '/cart', 'User', 'returns line items + dynamically calculated total'],
    ['POST', '/cart', 'User', '{ productId, quantity }  — increments if already in cart'],
    ['PATCH', '/cart/:productId', 'User', '{ quantity }  — 0 removes the line'],
    ['DELETE', '/cart/:productId', 'User', '—'],
  ]],
  ['Checkout & Orders  (protected)', [
    ['POST', '/orders/checkout', 'User', 'validates live stock, creates a PENDING order'],
    ['POST', '/orders/:id/confirm-payment', 'User', '{ success: true } → PAID, stock reduced, cart cleared'],
    ['GET', '/orders', 'User', 'query: page, limit'],
    ['GET', '/orders/:id', 'User', 'own order detail (ownership enforced)'],
  ]],
];

const doc = new PDFDocument({ size: 'A4', margins: { top: 42, bottom: 40, left: 46, right: 46 },
  info: { Title: 'E-commerce API Reference', Author: 'ecommerce-api' } });
doc.pipe(fs.createWriteStream(OUT));

const PAGE_W = doc.page.width;
const L = doc.page.margins.left;
const R = PAGE_W - doc.page.margins.right;
const W = R - L;

// ── Title ─────────────────────────────────────────────
doc.font('Helvetica-Bold').fontSize(22).fillColor(NAVY).text('E-commerce REST API', L, 46);
doc.font('Helvetica').fontSize(10.5).fillColor(GREY)
  .text('Endpoint Reference — Node.js (Express) + PostgreSQL', { paragraphGap: 6 });
doc.moveTo(L, doc.y + 2).lineTo(R, doc.y + 2).lineWidth(1.2).strokeColor(BLUE).stroke();
doc.moveDown(0.8);

// ── Meta box ──────────────────────────────────────────
const metaRows = [
  ['Base URL', BASE],
  ['Auth header', 'Authorization: Bearer <token>'],
  ['Health', 'GET http://localhost:4000/health'],
  ['Response', 'success: { "success": true, "data": ... }   error: { "success": false, "error": {...} }'],
  ['Demo logins', 'admin@example.com / Admin123!     customer@example.com / Customer123!'],
];
const metaTop = doc.y;
const labelW = 78;
const padY = 5;
doc.fontSize(9);
let my = metaTop;
const metaH = metaRows.length * (12 + padY);
doc.rect(L, metaTop, W, metaH).fill(LIGHT);
metaRows.forEach(([k, v]) => {
  doc.font('Helvetica-Bold').fillColor(NAVY).text(k, L + 8, my + padY, { width: labelW });
  doc.font(k === 'Base URL' || k === 'Auth header' || k === 'Health' ? 'Courier' : 'Helvetica')
    .fillColor('#33415c').text(v, L + 8 + labelW, my + padY, { width: W - labelW - 16 });
  my += 12 + padY;
});
doc.rect(L, metaTop, W, metaH).lineWidth(0.5).strokeColor(BORDER).stroke();
doc.y = metaTop + metaH + 10;

// ── Columns ───────────────────────────────────────────
const cM = L;            // method
const cP = L + 52;       // path
const cA = L + 188;      // auth
const cB = L + 232;      // body
const bodyW = R - cB;
const ROWPAD = 4;

function ensureSpace(h) {
  if (doc.y + h > doc.page.height - doc.page.margins.bottom) doc.addPage();
}

function sectionHeader(title) {
  ensureSpace(26);
  doc.moveDown(0.4);
  doc.font('Helvetica-Bold').fontSize(12.5).fillColor(BLUE).text(title, L, doc.y);
  doc.moveDown(0.2);
  // table header band
  const y = doc.y;
  doc.rect(L, y, W, 16).fill(NAVY);
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#ffffff');
  doc.text('METHOD', cM + 4, y + 4);
  doc.text('PATH', cP + 2, y + 4);
  doc.text('AUTH', cA + 2, y + 4);
  doc.text('BODY / PARAMS', cB + 2, y + 4);
  doc.y = y + 16;
}

function row(method, pathStr, auth, body, zebra) {
  doc.font('Courier').fontSize(7.8);
  const bodyH = doc.heightOfString(body, { width: bodyW - 6 });
  const rowH = Math.max(14, bodyH + ROWPAD * 2);
  ensureSpace(rowH);
  const y = doc.y;
  if (zebra) doc.rect(L, y, W, rowH).fill(LIGHT);

  doc.font('Helvetica-Bold').fontSize(8).fillColor(METHOD[method]).text(method, cM + 4, y + ROWPAD);
  doc.font('Courier').fontSize(8).fillColor(NAVY).text(pathStr, cP + 2, y + ROWPAD, { width: cA - cP - 6 });
  doc.font('Helvetica-Bold').fontSize(8).fillColor(AUTHC[auth]).text(auth, cA + 2, y + ROWPAD);
  doc.font('Helvetica').fontSize(7.8).fillColor('#33415c').text(body, cB + 2, y + ROWPAD, { width: bodyW - 6 });

  doc.rect(L, y, W, rowH).lineWidth(0.4).strokeColor(BORDER).stroke();
  doc.y = y + rowH;
}

for (const [title, rows] of SECTIONS) {
  sectionHeader(title);
  rows.forEach((r, i) => row(r[0], r[1], r[2], r[3], i % 2 === 1));
}

// ── Typical flow ──────────────────────────────────────
ensureSpace(120);
doc.moveDown(0.6);
doc.font('Helvetica-Bold').fontSize(12.5).fillColor(BLUE).text('Typical flow', L);
doc.moveDown(0.2);
const flow = [
  'POST /auth/login — capture the JWT token.',
  'GET /products — browse and find product IDs.',
  'POST /cart — add items (quantity increments if already present).',
  'GET /cart — review the dynamically calculated total.',
  'POST /orders/checkout — stock validated, a PENDING order is created.',
  'POST /orders/:id/confirm-payment — order becomes PAID, stock reduced, cart cleared.',
  '(Admin) POST /products — manage catalogue after logging in as admin.',
];
doc.font('Helvetica').fontSize(9.5).fillColor(NAVY);
flow.forEach((line, i) => {
  doc.text(`${i + 1}.  ${line}`, L + 4, doc.y, { paragraphGap: 3, width: W - 8 });
});

doc.moveDown(0.8);
doc.moveTo(L, doc.y).lineTo(R, doc.y).lineWidth(0.6).strokeColor(BORDER).stroke();
doc.moveDown(0.4);
doc.font('Helvetica').fontSize(8).fillColor(GREY).text(
  'Import postman_collection.json into Postman, or use requests.http in VS Code, to exercise these endpoints.',
  L, doc.y, { width: W });

doc.end();
doc.on('end', () => {});
console.log(`PDF written to: ${OUT}`);
