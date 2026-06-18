// tests/orders.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { resetDb } from './setup.js';
import { makeUser, makeProduct, seedCart, auth } from './helpers.js';
import { findProductById } from '../models/product.model.js';

describe('Checkout & Payment', () => {
  let token;
  let userId;
  let product;

  beforeEach(async () => {
    await resetDb();
    const u = await makeUser();
    token = u.token;
    userId = u.user.id;
    product = await makeProduct({ price: 20, stock: 5 });
  });

  it('rejects checkout with an empty cart (400)', async () => {
    const res = await request(app).post('/api/v1/orders/checkout').set(...auth(token));
    expect(res.status).toBe(400);
  });

  it('creates a pending order without decrementing stock', async () => {
    await seedCart(userId, product.id, 3);

    const res = await request(app).post('/api/v1/orders/checkout').set(...auth(token));
    expect(res.status).toBe(201);
    expect(res.body.data.order.status).toBe('pending');
    expect(res.body.data.order.total_amount).toBe('60.00');
    expect(res.body.data.payment.paymentRef).toMatch(/^MOCK-/);

    // Stock unchanged until payment.
    const fresh = await findProductById(product.id);
    expect(fresh.stock).toBe(5);
  });

  it('blocks checkout when stock is insufficient (409)', async () => {
    await seedCart(userId, product.id, 99);
    const res = await request(app).post('/api/v1/orders/checkout').set(...auth(token));
    expect(res.status).toBe(409);
    expect(res.body.error.details).toBeTruthy();
  });

  it('confirms payment: status=paid, stock reduced, cart cleared', async () => {
    await seedCart(userId, product.id, 2);
    const checkout = await request(app)
      .post('/api/v1/orders/checkout')
      .set(...auth(token));
    const orderId = checkout.body.data.order.id;

    const pay = await request(app)
      .post(`/api/v1/orders/${orderId}/confirm-payment`)
      .set(...auth(token))
      .send({ success: true });

    expect(pay.status).toBe(200);
    expect(pay.body.data.status).toBe('paid');

    // Stock reduced.
    const fresh = await findProductById(product.id);
    expect(fresh.stock).toBe(3);

    // Cart cleared.
    const cart = await request(app).get('/api/v1/cart').set(...auth(token));
    expect(cart.body.data.items).toHaveLength(0);
  });

  it('is idempotent: confirming an already-paid order does not double-reduce stock', async () => {
    await seedCart(userId, product.id, 2);
    const checkout = await request(app)
      .post('/api/v1/orders/checkout')
      .set(...auth(token));
    const orderId = checkout.body.data.order.id;

    await request(app).post(`/api/v1/orders/${orderId}/confirm-payment`).set(...auth(token));
    const second = await request(app)
      .post(`/api/v1/orders/${orderId}/confirm-payment`)
      .set(...auth(token));

    expect(second.status).toBe(200);
    expect(second.body.data.alreadyPaid).toBe(true);

    const fresh = await findProductById(product.id);
    expect(fresh.stock).toBe(3); // only reduced once
  });

  it('lets a user view their own orders but 404s on others', async () => {
    await seedCart(userId, product.id, 1);
    const checkout = await request(app)
      .post('/api/v1/orders/checkout')
      .set(...auth(token));
    const orderId = checkout.body.data.order.id;

    const list = await request(app).get('/api/v1/orders').set(...auth(token));
    expect(list.body.data).toHaveLength(1);

    // A different user cannot see this order.
    const other = await makeUser();
    const res = await request(app)
      .get(`/api/v1/orders/${orderId}`)
      .set(...auth(other.token));
    expect(res.status).toBe(404);
  });
});
