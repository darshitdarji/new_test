// tests/cart-wishlist.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { resetDb } from './setup.js';
import { makeUser, makeProduct, auth } from './helpers.js';

describe('Cart', () => {
  let token;
  let product;

  beforeEach(async () => {
    await resetDb();
    ({ token } = await makeUser());
    product = await makeProduct({ price: 25, stock: 10 });
  });

  it('requires authentication', async () => {
    const res = await request(app).get('/api/v1/cart');
    expect(res.status).toBe(401);
  });

  it('adds an item and increments quantity on re-add', async () => {
    await request(app)
      .post('/api/v1/cart')
      .set(...auth(token))
      .send({ productId: product.id, quantity: 2 });

    const res = await request(app)
      .post('/api/v1/cart')
      .set(...auth(token))
      .send({ productId: product.id, quantity: 3 });

    expect(res.status).toBe(201);
    expect(res.body.data.quantity).toBe(5);
  });

  it('computes the cart total dynamically', async () => {
    await request(app)
      .post('/api/v1/cart')
      .set(...auth(token))
      .send({ productId: product.id, quantity: 4 });

    const res = await request(app).get('/api/v1/cart').set(...auth(token));
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe('100.00'); // 4 * 25
    expect(res.body.data.itemCount).toBe(4);
  });

  it('updates quantity and removes the line when set to 0', async () => {
    await request(app)
      .post('/api/v1/cart')
      .set(...auth(token))
      .send({ productId: product.id, quantity: 4 });

    const update = await request(app)
      .patch(`/api/v1/cart/${product.id}`)
      .set(...auth(token))
      .send({ quantity: 1 });
    expect(update.body.data.quantity).toBe(1);

    const remove = await request(app)
      .patch(`/api/v1/cart/${product.id}`)
      .set(...auth(token))
      .send({ quantity: 0 });
    expect(remove.status).toBe(204);

    const cart = await request(app).get('/api/v1/cart').set(...auth(token));
    expect(cart.body.data.items).toHaveLength(0);
  });

  it('404s when adding a non-existent product', async () => {
    const res = await request(app)
      .post('/api/v1/cart')
      .set(...auth(token))
      .send({ productId: 99999, quantity: 1 });
    expect(res.status).toBe(404);
  });
});

describe('Wishlist', () => {
  let token;
  let product;

  beforeEach(async () => {
    await resetDb();
    ({ token } = await makeUser());
    product = await makeProduct();
  });

  it('adds, dedupes and lists wishlist items', async () => {
    const first = await request(app)
      .post('/api/v1/wishlist')
      .set(...auth(token))
      .send({ productId: product.id });
    expect(first.status).toBe(201);
    expect(first.body.data.added).toBe(true);

    // Re-adding is idempotent.
    const second = await request(app)
      .post('/api/v1/wishlist')
      .set(...auth(token))
      .send({ productId: product.id });
    expect(second.body.data.added).toBe(false);

    const list = await request(app).get('/api/v1/wishlist').set(...auth(token));
    expect(list.body.data).toHaveLength(1);
  });

  it('removes an item', async () => {
    await request(app)
      .post('/api/v1/wishlist')
      .set(...auth(token))
      .send({ productId: product.id });

    const res = await request(app)
      .delete(`/api/v1/wishlist/${product.id}`)
      .set(...auth(token));
    expect(res.status).toBe(204);
  });
});
