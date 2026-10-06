import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { randomBytes } from 'node:crypto';
import { registerCommerce } from './commerce.js';
import { productFromRow, insertProduct } from './db.js';
import { hashPassword, verifyPassword, digest, publicUser, readToken } from './auth.js';

const fail = (status, message) => Object.assign(new Error(message), { status });
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const productFields = ['title', 'description', 'price', 'discountPercentage', 'rating', 'stock', 'brand', 'category', 'thumbnail', 'images'];
function validateProduct(body) {
  if (!body || Array.isArray(body) || typeof body !== 'object') throw fail(400, 'A product object is required.');
  if (Object.keys(body).some(key => !productFields.includes(key))) throw fail(400, 'Unknown product field.');
  const product = { discountPercentage: 0, rating: 0, ...body };
  for (const key of ['title', 'description', 'brand', 'category', 'thumbnail']) {
    if (typeof product[key] !== 'string' || !product[key].trim() || product[key].length > (key === 'description' ? 5000 : 1000)) throw fail(400, `Invalid ${key}.`);
    product[key] = product[key].trim();
  }
  for (const key of ['price', 'discountPercentage', 'rating', 'stock']) {
    if (typeof product[key] !== 'number' || !Number.isFinite(product[key]) || product[key] < 0) throw fail(400, `Invalid ${key}.`);
  }
  if (!Number.isSafeInteger(product.stock) || product.price > 100000000 || product.discountPercentage > 100 || product.rating > 5) throw fail(400, 'Product number out of range.');
  const safeImage = value => typeof value === 'string' && value.length <= 2048 && (/^https?:\/\//i.test(value) || /^\/(?!\/)/.test(value));
  if (!safeImage(product.thumbnail) || !Array.isArray(product.images) || product.images.length > 20 || !product.images.every(safeImage)) throw fail(400, 'Images must be HTTP(S) URLs or local paths.');
  return product;
}

export async function createApp(db, { origin = process.env.APP_ORIGIN || 'http://localhost:5173', production = process.env.NODE_ENV === 'production' } = {}) {
  const app = express();
  const dummyHash = await hashPassword(randomBytes(32).toString('hex'));
  const cookieOptions = { httpOnly: true, sameSite: 'strict', secure: production, path: '/api' };
  app.disable('x-powered-by');
  app.use(helmet());
  app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    // Browser mutations must originate from this application. Non-browser clients may omit Origin.
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) &&
      ((req.headers.origin && req.headers.origin !== origin) || req.headers['sec-fetch-site'] === 'cross-site')) {
      return next(fail(403, 'Request origin is not allowed.'));
    }
    next();
  });
  app.use(express.json({ limit: '64kb' }));
  const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false,
    message: { message: 'Too many authentication attempts. Try again later.' } });
  app.use('/api/auth/register', authLimiter);
  app.use('/api/auth/login', authLimiter);

  function startSession(req, res, user) {
    const old = readToken(req);
    if (old) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(digest(old));
    const now = Date.now();
    db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(now);
    const token = randomBytes(32).toString('hex');
    const duration = 7 * 24 * 60 * 60 * 1000;
    db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)').run(digest(token), user.id, now + duration);
    res.cookie('boutique_session', token, { ...cookieOptions, maxAge: duration });
  }
  function requireUser(req, res, next) {
    const token = readToken(req);
    const row = token && db.prepare(`SELECT users.* FROM users JOIN sessions ON users.id = sessions.user_id
      WHERE sessions.token_hash = ? AND sessions.expires_at > ?`).get(digest(token), Date.now());
    if (!row) return next(fail(401, 'Please sign in.'));
    req.user = row;
    next();
  }
  function requireAdmin(req, res, next) {
    if (req.user.role !== 'admin') return next(fail(403, 'Administrator access required.'));
    next();
  }
  app.get('/api/health', (req, res) => { db.prepare('SELECT 1').get(); res.json({ status: 'ok' }); });
  app.post('/api/auth/register', async (req, res) => {
    const { email, password, name } = req.body || {};
    if (typeof email !== 'string' || email.length > 254 || !emailPattern.test(email.trim())) throw fail(400, 'Enter a valid email address.');
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 100) throw fail(400, 'Name must contain 1–100 characters.');
    if (typeof password !== 'string' || password.length < 8 || password.length > 128) throw fail(400, 'Password must contain 8–128 characters.');
    const normalized = email.trim().toLowerCase();
    const passwordHash = await hashPassword(password);
    // Check after hashing; the synchronous insert below cannot race another request in this process.
    if (db.prepare('SELECT id FROM users WHERE email = ?').get(normalized)) throw fail(409, 'An account with this email already exists.');
    const result = db.prepare('INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)').run(normalized, name.trim(), passwordHash);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(Number(result.lastInsertRowid));
    startSession(req, res, user);
    res.status(201).json({ user: publicUser(user) });
  });
  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body || {};
    if (typeof email !== 'string' || email.length > 254 || typeof password !== 'string' || password.length > 128) throw fail(400, 'Email and password are required.');
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim().toLowerCase());
    const valid = await verifyPassword(password, user?.password_hash || dummyHash);
    if (!user || !valid) throw fail(401, 'Invalid email or password.');
    startSession(req, res, user);
    res.json({ user: publicUser(user) });
  });
  app.get('/api/auth/me', requireUser, (req, res) => res.json({ user: publicUser(req.user) }));
  app.post('/api/auth/logout', (req, res) => {
    const token = readToken(req);
    if (token) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(digest(token));
    res.clearCookie('boutique_session', cookieOptions).status(204).end();
  });
  app.get('/api/products', (req, res) => {
    const integer = (value, fallback, max) => {
      if (value === undefined) return fallback;
      if (typeof value !== 'string' || !/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) > max) throw fail(400, 'Invalid pagination.');
      return Number(value);
    };
    const limit = integer(req.query.limit, 100, 100);
    const skip = integer(req.query.skip, 0, Number.MAX_SAFE_INTEGER);
    if (limit < 1) throw fail(400, 'Limit must be at least 1.');
    const { q = '', category = '' } = req.query;
    if (typeof q !== 'string' || typeof category !== 'string' || q.length > 200 || category.length > 1000) throw fail(400, 'Invalid product filter.');
    const where = `WHERE (instr(lower(title || ' ' || brand || ' ' || description), lower(?)) > 0) AND (? = '' OR category = ?)`;
    const params = [q, category, category];
    const { total } = db.prepare(`SELECT count(*) AS total FROM products ${where}`).get(...params);
    const products = db.prepare(`SELECT * FROM products ${where} ORDER BY price DESC, id ASC LIMIT ? OFFSET ?`).all(...params, limit, skip).map(productFromRow);
    res.json({ products, total, skip, limit });
  });
  app.param('id', (req, res, next, value) => {
    if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value))) return next(fail(400, 'Invalid product ID.'));
    req.productId = Number(value); next();
  });
  const findProduct = id => {
    const product = productFromRow(db.prepare('SELECT * FROM products WHERE id = ?').get(id));
    if (!product) throw fail(404, 'Product not found.');
    return product;
  };
  app.get('/api/products/:id', (req, res) => res.json(findProduct(req.productId)));
  app.post('/api/products', requireUser, requireAdmin, (req, res) => res.status(201).json(insertProduct(db, validateProduct(req.body))));
  app.patch('/api/products/:id', requireUser, requireAdmin, (req, res) => {
    const { id, ...existing } = findProduct(req.productId);
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body) || !Object.keys(req.body).length) throw fail(400, 'Provide product fields to update.');
    const product = validateProduct({ ...existing, ...req.body });
    db.prepare(`UPDATE products SET ${productFields.map(key => `${key} = ?`).join(',')} WHERE id = ?`)
      .run(...productFields.map(key => key === 'images' ? JSON.stringify(product[key]) : product[key]), id);
    res.json(findProduct(id));
  });
  app.delete('/api/products/:id', requireUser, requireAdmin, (req, res) => {
    findProduct(req.productId);
    db.prepare('DELETE FROM products WHERE id = ?').run(req.productId);
    res.status(204).end();
  });
  registerCommerce(app, db, requireUser, requireAdmin);
  app.use('/api', (req, res) => res.status(404).json({ message: 'API route not found.' }));
  app.use((err, req, res, next) => {
    if (err.errcode === 13 || /database or disk is full/i.test(err.message)) return res.status(507).json({ message: 'Local storage limit reached. Contact the administrator before adding more data.' });
    const status = err.status >= 400 && err.status < 500 ? err.status : 500;
    if (status === 500) console.error(err);
    res.status(status).json({ message: status === 500 ? 'An unexpected server error occurred.' : (err.type === 'entity.parse.failed' ? 'Invalid JSON body.' : err.message) });
  });
  return app;
}
