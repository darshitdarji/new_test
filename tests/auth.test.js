// tests/auth.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { resetDb } from './setup.js';

const base = '/api/v1/auth';

describe('Auth', () => {
  beforeEach(resetDb);

  it('signs up a new user and returns a token', async () => {
    const res = await request(app)
      .post(`${base}/signup`)
      .send({ name: 'Ada', email: 'ada@test.dev', password: 'Password123!' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.user.email).toBe('ada@test.dev');
    // Never leak sensitive fields.
    expect(res.body.data.user.password_hash).toBeUndefined();
  });

  it('rejects duplicate email with 409', async () => {
    const payload = { name: 'Ada', email: 'dup@test.dev', password: 'Password123!' };
    await request(app).post(`${base}/signup`).send(payload);
    const res = await request(app).post(`${base}/signup`).send(payload);
    expect(res.status).toBe(409);
  });

  it('rejects invalid signup input with 422', async () => {
    const res = await request(app)
      .post(`${base}/signup`)
      .send({ name: '', email: 'not-an-email', password: 'short' });
    expect(res.status).toBe(422);
    expect(res.body.error.details.length).toBeGreaterThan(0);
  });

  it('logs in with valid credentials', async () => {
    await request(app)
      .post(`${base}/signup`)
      .send({ name: 'Bo', email: 'bo@test.dev', password: 'Password123!' });

    const res = await request(app)
      .post(`${base}/login`)
      .send({ email: 'bo@test.dev', password: 'Password123!' });

    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeTruthy();
  });

  it('rejects wrong password with 401', async () => {
    await request(app)
      .post(`${base}/signup`)
      .send({ name: 'Bo', email: 'bo2@test.dev', password: 'Password123!' });

    const res = await request(app)
      .post(`${base}/login`)
      .send({ email: 'bo2@test.dev', password: 'wrongpass' });

    expect(res.status).toBe(401);
  });

  it('completes the forgot → reset password flow', async () => {
    await request(app)
      .post(`${base}/signup`)
      .send({ name: 'Cy', email: 'cy@test.dev', password: 'Password123!' });

    // Capture the mock-emailed reset token from the console log.
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await request(app).post(`${base}/forgot-password`).send({ email: 'cy@test.dev' });

    const logged = logSpy.mock.calls.flat().join('\n');
    logSpy.mockRestore();
    const token = logged.match(/Reset token: (\w+)/)?.[1];
    expect(token).toBeTruthy();

    const reset = await request(app)
      .post(`${base}/reset-password`)
      .send({ token, password: 'NewPassword123!' });
    expect(reset.status).toBe(200);

    // Old password no longer works; new one does.
    const oldLogin = await request(app)
      .post(`${base}/login`)
      .send({ email: 'cy@test.dev', password: 'Password123!' });
    expect(oldLogin.status).toBe(401);

    const newLogin = await request(app)
      .post(`${base}/login`)
      .send({ email: 'cy@test.dev', password: 'NewPassword123!' });
    expect(newLogin.status).toBe(200);
  });

  it('does not reveal whether an email exists on forgot-password', async () => {
    const res = await request(app)
      .post(`${base}/forgot-password`)
      .send({ email: 'nobody@test.dev' });
    expect(res.status).toBe(200);
  });
});
