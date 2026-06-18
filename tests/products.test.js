// tests/products.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { resetDb } from './setup.js';
import { makeUser, makeProduct, auth } from './helpers.js';

const base = '/api/v1/products';

describe('Products', () => {
  beforeEach(async () => {
    await resetDb();
    await makeProduct({ name: 'Red Shoes', category: 'fashion', price: 50 });
    await makeProduct({ name: 'Blue Shoes', category: 'fashion', price: 150 });
    await makeProduct({ name: 'Desk Lamp', category: 'home', price: 30 });
    await makeProduct({ name: 'Hidden Item', category: 'home', price: 30, is_active: false });
  });

  it('lists only active products with pagination meta', async () => {
    const res = await request(app).get(base);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(3); // inactive excluded
    expect(res.body.meta.total).toBe(3);
    expect(res.body.meta.page).toBe(1);
  });

  it('filters by category and price range', async () => {
    const res = await request(app).get(base).query({
      category: 'fashion',
      minPrice: 100,
    });
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe('Blue Shoes');
  });

  it('searches by name (ILIKE)', async () => {
    const res = await request(app).get(base).query({ q: 'shoes' });
    expect(res.body.data).toHaveLength(2);
  });

  it('paginates', async () => {
    const res = await request(app).get(base).query({ page: 1, limit: 2 });
    expect(res.body.data).toHaveLength(2);
    expect(res.body.meta.totalPages).toBe(2);
    expect(res.body.meta.hasNextPage).toBe(true);
  });

  it('returns 404 for a missing or inactive product', async () => {
    const res = await request(app).get(`${base}/99999`);
    expect(res.status).toBe(404);
  });

  it('rejects invalid id param with 422', async () => {
    const res = await request(app).get(`${base}/not-a-number`);
    expect(res.status).toBe(422);
  });

  describe('admin CRUD', () => {
    it('forbids product creation for customers (403)', async () => {
      const { token } = await makeUser({ role: 'customer' });
      const res = await request(app)
        .post(base)
        .set(...auth(token))
        .send({ name: 'X', price: 5, category: 'home' });
      expect(res.status).toBe(403);
    });

    it('requires auth (401) without a token', async () => {
      const res = await request(app).post(base).send({ name: 'X', price: 5, category: 'home' });
      expect(res.status).toBe(401);
    });

    it('allows an admin to create, update and delete', async () => {
      const { token } = await makeUser({ role: 'admin' });

      const createRes = await request(app)
        .post(base)
        .set(...auth(token))
        .send({ name: 'Gadget', price: 12.5, category: 'electronics', stock: 5 });
      expect(createRes.status).toBe(201);
      const id = createRes.body.data.id;

      const updateRes = await request(app)
        .put(`${base}/${id}`)
        .set(...auth(token))
        .send({ price: 9.99 });
      expect(updateRes.status).toBe(200);
      expect(Number(updateRes.body.data.price)).toBe(9.99);

      const deleteRes = await request(app)
        .delete(`${base}/${id}`)
        .set(...auth(token));
      expect(deleteRes.status).toBe(204);
    });
  });
});
