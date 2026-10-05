import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDatabase } from '../db.js';
import { createApp } from '../app.js';

const product = { title: 'Test Watch', description: 'A test timepiece', brand: 'Boutique', category: 'mens-watches', price: 100, stock: 4, thumbnail: '/sample-watch.svg', images: ['/sample-watch.svg'] };
async function fixture(t, db = openDatabase(':memory:'), options) {
  const app = await createApp(db, options);
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(async () => { await new Promise(resolve => server.close(resolve)); db.close(); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = async (path, { method = 'GET', body, cookie, headers = {} } = {}) => {
    const res = await fetch(base + path, { method, headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}), ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: res.status, cookie: res.headers.get('set-cookie')?.split(';')[0], headers: res.headers, data: res.status === 204 ? null : await res.json() };
  };
  return { db, request };
}
const account = { email: 'client@example.com', password: 'correct horse battery', name: 'Client' };

test('registration, normalized email, password hashing, login, restore, rotation and logout', async t => {
  const { db, request } = await fixture(t);
  const registration = await request('/api/auth/register', { method: 'POST', body: { ...account, email: ' CLIENT@example.com ', role: 'admin' } });
  assert.equal(registration.status, 201);
  assert.equal(registration.data.user.role, 'customer');
  assert.equal(registration.data.user.email, account.email);
  assert.equal(registration.data.user.password_hash, undefined);
  assert.match(registration.headers.get('set-cookie'), /HttpOnly/);
  assert.match(registration.headers.get('set-cookie'), /SameSite=Strict/);
  assert.notEqual(db.prepare('SELECT password_hash FROM users').get().password_hash, account.password);
  assert.notEqual(db.prepare('SELECT token_hash FROM sessions').get().token_hash, registration.cookie.split('=')[1]);
  assert.equal((await request('/api/auth/me', { cookie: registration.cookie })).status, 200);
  assert.equal((await request('/api/auth/register', { method: 'POST', body: account })).status, 409);
  const wrong = await request('/api/auth/login', { method: 'POST', body: { ...account, password: 'wrong' } });
  assert.equal(wrong.status, 401);
  const unknown = await request('/api/auth/login', { method: 'POST', body: { ...account, email: 'unknown@example.com' } });
  assert.deepEqual(unknown.data, wrong.data);
  const login = await request('/api/auth/login', { method: 'POST', body: account, cookie: registration.cookie });
  assert.equal(login.status, 200);
  assert.notEqual(login.cookie, registration.cookie);
  assert.equal((await request('/api/auth/me', { cookie: registration.cookie })).status, 401);
  assert.equal((await request('/api/auth/logout', { method: 'POST', cookie: login.cookie })).status, 204);
  assert.equal((await request('/api/auth/me', { cookie: login.cookie })).status, 401);
});

test('validation, CSRF origin checks, missing and expired sessions', async t => {
  const { db, request } = await fixture(t);
  assert.equal((await request('/api/auth/register', { method: 'POST', body: { ...account, password: 'short' } })).status, 400);
  assert.equal((await request('/api/auth/register', { method: 'POST', body: { ...account, email: 'bad' } })).status, 400);
  assert.equal((await request('/api/auth/register', { method: 'POST', body: account, headers: { Origin: 'https://evil.example' } })).status, 403);
  assert.equal((await request('/api/auth/logout', { method: 'POST', headers: { 'Sec-Fetch-Site': 'cross-site' } })).status, 403);
  assert.equal((await request('/api/auth/me')).status, 401);
  const registration = await request('/api/auth/register', { method: 'POST', body: account, headers: { Origin: 'http://localhost:5173' } });
  db.prepare('UPDATE sessions SET expires_at = 0').run();
  assert.equal((await request('/api/auth/me', { cookie: registration.cookie })).status, 401);
  assert.equal((await request('/api/unknown')).status, 404);
});

test('public product reads, admin-only writes, filtering, pagination and validation', async t => {
  const { db, request } = await fixture(t);
  assert.equal((await request('/api/products')).data.total, 0);
  assert.equal((await request('/api/products', { method: 'POST', body: product })).status, 401);
  const { cookie } = await request('/api/auth/register', { method: 'POST', body: account });
  assert.equal((await request('/api/products', { method: 'POST', body: product, cookie })).status, 403);
  db.prepare("UPDATE users SET role = 'admin'").run();
  const created = await request('/api/products', { method: 'POST', body: product, cookie });
  assert.equal(created.status, 201);
  const id = created.data.id;
  assert.deepEqual(created.data.images, product.images);
  assert.equal((await request(`/api/products/${id}`)).data.title, product.title);
  await request('/api/products', { method: 'POST', body: { ...product, title: 'Dress Watch', price: 200, category: 'womens-watches' }, cookie });
  const page = await request('/api/products?limit=1&skip=1');
  assert.equal(page.data.total, 2);
  assert.equal(page.data.products[0].id, id);
  assert.equal((await request('/api/products?category=womens-watches&q=dress')).data.total, 1);
  assert.equal((await request('/api/products?q=%27%20OR%201%3D1--')).data.total, 0);
  assert.equal((await request('/api/products?limit=-1')).status, 400);
  assert.equal((await request('/api/products?limit=101')).status, 400);
  assert.equal((await request('/api/products/bad')).status, 400);
  assert.equal((await request('/api/products/99999')).status, 404);
  for (const invalid of [{ price: -1 }, { stock: 1.5 }, { images: ['javascript:alert(1)'] }, { rating: 6 }, { discountPercentage: 101 }, { extra: 'unexpected' }]) {
    assert.equal((await request(`/api/products/${id}`, { method: 'PATCH', body: invalid, cookie })).status, 400);
  }
  assert.equal((await request(`/api/products/${id}`, { method: 'PATCH', body: { stock: 9 }, cookie })).data.stock, 9);
  assert.equal((await request(`/api/products/${id}`, { method: 'DELETE', cookie })).status, 204);
  assert.equal((await request(`/api/products/${id}`)).status, 404);
});

test('authentication requests are rate limited', async t => {
  const { request } = await fixture(t);
  for (let i = 0; i < 30; i++) assert.equal((await request('/api/auth/login', { method: 'POST', body: {} })).status, 400);
  assert.equal((await request('/api/auth/login', { method: 'POST', body: {} })).status, 429);
});

test('production session cookies require HTTPS', async t => {
  const { request } = await fixture(t, undefined, { production: true });
  const response = await request('/api/auth/register', { method: 'POST', body: account });
  assert.match(response.headers.get('set-cookie'), /Secure/);
});

test('users, products and sessions survive database and application restarts', async t => {
  const dir = mkdtempSync(join(tmpdir(), 'boutique-test-'));
  const filename = join(dir, 'test.sqlite');
  let cookie;
  try {
    await t.test('first instance', async child => {
      const { request, db } = await fixture(child, openDatabase(filename));
      ({ cookie } = await request('/api/auth/register', { method: 'POST', body: account }));
      db.prepare("UPDATE users SET role = 'admin'").run();
      assert.equal((await request('/api/products', { method: 'POST', cookie, body: product })).status, 201);
    });
    await t.test('reopened instance', async child => {
      const { request } = await fixture(child, openDatabase(filename));
      assert.equal((await request('/api/auth/me', { cookie })).status, 200);
      assert.equal((await request('/api/products')).data.total, 1);
      assert.equal((await request('/api/auth/login', { method: 'POST', body: account })).status, 200);
    });
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
