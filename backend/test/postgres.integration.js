import assert from 'node:assert/strict';
import pg from 'pg';
import { openPostgres } from '../database/postgres.js';
import { createApp } from '../app.js';
import { randomUUID } from 'node:crypto';
const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is required');
const schema = 'test_' + randomUUID().replaceAll('-', '');
const manager = new pg.Client({ connectionString: url });
await manager.connect();
await manager.query(`CREATE SCHEMA ${schema}`);
const isolated = new URL(url); isolated.searchParams.set('options', `-c search_path=${schema}`);
let db, server;
try {
  db = openPostgres(isolated.toString());
  const app = await createApp(db, { production: false, origin: 'http://localhost:8080', contactSender: null });
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  let cookie;
  const request = async (path, body, method = body ? 'POST' : 'GET') => {
    const r = await fetch(`http://127.0.0.1:${server.address().port}/api${path}`, { method,
      headers: { Origin: 'http://localhost:8080', 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
      body: body ? JSON.stringify(body) : undefined });
    if (r.headers.get('set-cookie')) cookie = r.headers.get('set-cookie').split(';')[0];
    const data = r.status === 204 ? null : await r.json();
    assert.ok(r.ok, `${path}: ${r.status} ${JSON.stringify(data)}`); return data;
  };
  const credentials = { name: 'Integration', email: 'integration@example.com', password: randomUUID() };
  await request('/auth/register', credentials);
  db.prepare("UPDATE users SET role = 'admin' WHERE email = ?").run(credentials.email);
  await request('/auth/login', credentials);
  const product = await request('/products', { title: 'Integration watch', description: 'Test', price: 100, discountPercentage: 10, stock: 2, brand: 'Test', category: 'mens-watches', thumbnail: '/sample-watch.svg', images: ['/sample-watch.svg'] });
  assert.equal(product.discountPercentage, 10);
  assert.equal((await request('/products?q=Integration')).total, 1);
  await request('/auth/security');
  const orderBody = { requestKey: randomUUID(), items: [{ productId: product.id, quantity: 1 }], shipping: { name: 'Test', phone: '1234567890', address: 'Test Street', city: 'Colombo', postalCode: '10000', country: 'Sri Lanka' } };
  const order = await request('/orders', orderBody);
  assert.equal(order.total_cents, 9000);
  assert.equal((await request('/orders', orderBody)).id, order.id);
  assert.equal((await request('/products/' + product.id)).stock, 1);
  await request(`/orders/${order.id}/cancel`, {});
  assert.equal((await request('/products/' + product.id)).stock, 2);
  const summary = await request('/admin/summary');
  assert.equal(summary.storage.engine, 'PostgreSQL');
  assert.equal(typeof summary.bookedCents, 'number');
  await request('/auth/logout', {});
  console.log('PostgreSQL registration, login, admin CRUD, discounted checkout, retry, cancellation and summary passed.');
} finally {
  if (server) await new Promise(resolve => server.close(resolve));
  db?.close();
  await manager.query(`DROP SCHEMA ${schema} CASCADE`);
  await manager.end();
}
