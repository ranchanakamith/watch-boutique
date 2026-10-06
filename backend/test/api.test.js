import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDatabase } from '../db.js';
import { createApp } from '../app.js';
import { seedCatalog } from '../seed.js';

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
const shipping = { name: 'Customer', phone: '0123456789', address: '12 Test Road', city: 'Test City', postalCode: '10000', country: 'Test Country' };

test('checkout uses server prices, retries are idempotent, access is private and cancellation restocks once', async t => {
  const { db, request } = await fixture(t);
  const { cookie } = await request('/api/auth/register', { method: 'POST', body: account });
  db.prepare("UPDATE users SET role = 'admin'").run();
  const watch = (await request('/api/products', { method: 'POST', body: { ...product, discountPercentage: 10 }, cookie })).data;
  const other = await request('/api/auth/register', { method: 'POST', body: { ...account, email: 'other@example.com' } });
  assert.equal((await request('/api/admin/summary', { cookie: other.cookie })).status, 403);
  assert.equal((await request('/api/admin/orders', { cookie: other.cookie })).status, 403);
  const body = { items: [{ productId: watch.id, quantity: 2, price: 1 }], shipping, requestKey: 'checkout-request-0001', total: 1 };
  const placed = await request('/api/orders', { method: 'POST', cookie, body });
  assert.equal(placed.status, 201);
  assert.equal(placed.data.total_cents, 18000);
  assert.equal(placed.data.payment_status, 'unpaid');
  assert.equal((await request(`/api/products/${watch.id}`)).data.stock, 2);
  assert.equal((await request('/api/orders', { method: 'POST', cookie, body })).data.id, placed.data.id);
  assert.equal((await request(`/api/products/${watch.id}`)).data.stock, 2);
  assert.equal((await request('/api/orders', { method: 'POST', cookie, body: { ...body, shipping: { ...shipping, city: 'Changed' } } })).status, 409);
  assert.equal((await request(`/api/orders/${placed.data.id}`, { cookie: other.cookie })).status, 404);
  assert.equal((await request(`/api/orders/${placed.data.id}/cancel`, { method: 'POST', cookie: other.cookie })).status, 404);
  assert.equal((await request('/api/orders', { cookie: other.cookie })).data.orders.length, 0);
  assert.equal((await request(`/api/orders/${placed.data.id}/cancel`, { method: 'POST', cookie })).status, 200);
  assert.equal((await request(`/api/products/${watch.id}`)).data.stock, 4);
  assert.equal((await request(`/api/orders/${placed.data.id}/cancel`, { method: 'POST', cookie })).status, 409);
  assert.equal((await request('/api/admin/summary', { cookie })).data.bookedCents, 0);
});

test('checkout is atomic, rejects malformed items and prevents overselling', async t => {
  const { db, request } = await fixture(t);
  const { cookie } = await request('/api/auth/register', { method: 'POST', body: account });
  db.prepare("UPDATE users SET role = 'admin'").run();
  const p = (await request('/api/products', { method: 'POST', body: { ...product, stock: 1 }, cookie })).data;
  const body = { items: [{ productId: p.id, quantity: 1 }], shipping, requestKey: 'atomic-checkout-0001' };
  for (const items of [[], [null], [{ productId: p.id, quantity: -1 }], [{ productId: p.id, quantity: 1.5 }], [body.items[0], body.items[0]]]) {
    assert.equal((await request('/api/orders', { method: 'POST', cookie, body: { ...body, items } })).status, 400);
  }
  assert.equal((await request('/api/orders', { method: 'POST', cookie, body: { ...body, items: [...body.items, { productId: 99999, quantity: 1 }] } })).status, 409);
  assert.equal((await request(`/api/products/${p.id}`)).data.stock, 1);
  const results = await Promise.all(['atomic-checkout-0002', 'atomic-checkout-0003'].map(requestKey => request('/api/orders', { method: 'POST', cookie, body: { ...body, requestKey } })));
  assert.deepEqual(results.map(r => r.status).sort(), [201,409]);
  assert.equal((await request(`/api/products/${p.id}`)).data.stock, 0);
  assert.equal((await request('/api/orders', { cookie })).data.orders.length, 1);
});

test('fulfillment transitions, payment totals and historical receipts after deletion', async t => {
  const { db, request } = await fixture(t);
  const { cookie } = await request('/api/auth/register', { method: 'POST', body: account });
  db.prepare("UPDATE users SET role = 'admin'").run();
  const p = (await request('/api/products', { method: 'POST', cookie, body: product })).data;
  const order = (await request('/api/orders', { method: 'POST', cookie, body: { items: [{ productId: p.id, quantity: 1 }], shipping, requestKey: 'fulfill-request-0001' } })).data;
  const path = `/api/admin/orders/${order.id}`;
  assert.equal((await request(path, { method: 'PATCH', cookie, body: { payment_status: 'paid' } })).status, 400);
  assert.equal((await request(path, { method: 'PATCH', cookie, body: { status: 'delivered' } })).status, 409);
  for (const status of ['processing','shipped','delivered']) assert.equal((await request(path, { method: 'PATCH', cookie, body: { status, tracking: 'SHIP-123' } })).status, 200);
  assert.equal((await request(`/api/orders/${order.id}/cancel`, { method: 'POST', cookie })).status, 409);
  assert.equal((await request(path, { method: 'PATCH', cookie, body: { payment_status: 'paid' } })).status, 200);
  assert.equal((await request(path, { method: 'PATCH', cookie, body: { payment_status: 'unpaid' } })).status, 400);
  const summary = (await request('/api/admin/summary', { cookie })).data;
  assert.equal(summary.paidCents, 10000); assert.equal(summary.bookedCents, 10000);
  assert.equal(summary.dailySales[0].cents, 10000);
  assert.equal((await request(`/api/products/${p.id}`, { method: 'DELETE', cookie })).status, 204);
  const receipt = (await request(`/api/orders/${order.id}`, { cookie })).data;
  assert.equal(receipt.items[0].title, product.title); assert.equal(receipt.items[0].product_id, null);
  assert.equal(receipt.tracking, 'SHIP-123');
});

test('seed is repeatable and preserves edits and deliberately deleted imported products', () => {
  const db = openDatabase(':memory:');
  try {
    assert.equal(seedCatalog(db), 11); assert.equal(seedCatalog(db), 0);
    db.prepare("UPDATE products SET title = 'Owner edited', stock = 2 WHERE id = 1").run();
    db.prepare('DELETE FROM products WHERE id = 2').run();
    assert.equal(seedCatalog(db), 0);
    assert.equal(db.prepare('SELECT count(*) AS total FROM products').get().total, 10);
    assert.equal(db.prepare('SELECT title FROM products WHERE id = 1').get().title, 'Owner edited');
  } finally { db.close(); }
});

test('database page limit is installed and full-disk writes return a useful error', async t => {
  const { db, request } = await fixture(t);
  const pageSize = db.prepare('PRAGMA page_size').get().page_size;
  assert.ok(db.prepare('PRAGMA max_page_count').get().max_page_count * pageSize <= 80_000_000);
  const { cookie } = await request('/api/auth/register', { method: 'POST', body: account });
  db.prepare("UPDATE users SET role = 'admin'").run();
  const pages = db.prepare('PRAGMA page_count').get().page_count;
  db.exec(`PRAGMA max_page_count = ${pages}`);
  const result = await request('/api/products', { method: 'POST', cookie, body: { ...product, description: 'x'.repeat(5000) } });
  assert.equal(result.status, 507);
  assert.equal(db.prepare('SELECT count(*) AS count FROM products').get().count, 0);
});

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
      const created = await request('/api/products', { method: 'POST', cookie, body: product });
      assert.equal(created.status, 201);
      assert.equal((await request('/api/orders', { method: 'POST', cookie, body: { items: [{ productId: created.data.id, quantity: 1 }], shipping, requestKey: 'persistent-order-0001' } })).status, 201);
    });
    await t.test('reopened instance', async child => {
      const { request } = await fixture(child, openDatabase(filename));
      assert.equal((await request('/api/auth/me', { cookie })).status, 200);
      assert.equal((await request('/api/products')).data.total, 1);
      const saved = (await request('/api/orders', { cookie })).data.orders;
      assert.equal(saved.length, 1);
      assert.equal(saved[0].total_cents, 10000);
      assert.equal((await request('/api/products')).data.products[0].stock, 3);
      assert.equal((await request('/api/auth/login', { method: 'POST', body: account })).status, 200);
    });
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
