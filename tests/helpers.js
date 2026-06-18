// tests/helpers.js
// Factory helpers that seed state directly via the models, plus auth helpers.
import { createUser } from '../models/user.model.js';
import { createProduct } from '../models/product.model.js';
import { addToCart } from '../models/cart.model.js';
import { hashPassword } from '../utils/password.js';
import { signToken } from '../utils/token.js';

let emailCounter = 0;

/** Create a user (default customer) and return { user, token, password }. */
export async function makeUser({ role = 'customer', password = 'Password123!' } = {}) {
  emailCounter += 1;
  const email = `user${emailCounter}@test.dev`;
  const passwordHash = await hashPassword(password);
  const user = await createUser({ name: `User ${emailCounter}`, email, passwordHash, role });
  const token = signToken({ id: user.id, role: user.role });
  return { user, token, password };
}

/** Create a product with sensible defaults. */
export async function makeProduct(overrides = {}) {
  return createProduct({
    name: 'Test Product',
    description: 'desc',
    price: 10.0,
    category: 'general',
    stock: 100,
    ...overrides,
  });
}

/** Put a product into a user's cart. */
export const seedCart = (userId, productId, quantity = 1) =>
  addToCart(userId, productId, quantity);

/** Authorization header tuple for supertest. */
export const auth = (token) => ['Authorization', `Bearer ${token}`];
