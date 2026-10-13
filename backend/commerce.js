import { statSync } from 'node:fs';
import { DATABASE_LIMIT_BYTES } from './db.js';

const fail = (status, message) => Object.assign(new Error(message), { status });
export function transaction(db, operation) {
  db.exec('BEGIN IMMEDIATE');
  try { const result = operation(); db.exec('COMMIT'); return result; }
  catch (error) { if (db.isTransaction) db.exec('ROLLBACK'); throw error; }
}
export function storageUsage(db) {
  const path = db.prepare('PRAGMA database_list').all().find(row => row.name === 'main').file;
  const size = file => { try { return statSync(file).size; } catch { return 0; } };
  return { usedBytes: path ? ['', '-journal', '-wal', '-shm'].reduce((sum, suffix) => sum + size(path + suffix), 0) : 0,
    databaseLimitBytes: DATABASE_LIMIT_BYTES, budgetBytes: 200_000_000 };
}
export function registerCommerce(app, db, requireUser, requireAdmin) {
  const getOrder = id => {
    const row = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    if (!row) throw fail(404, 'Order not found.');
    const { request_key, request_body, ...order } = row;
    return { ...order, shipping: JSON.parse(order.shipping), currency: 'USD', payment_method: 'cash_on_delivery',
      items: db.prepare('SELECT product_id, title, unit_cents, quantity FROM order_items WHERE order_id = ?').all(id) };
  };
  const orderId = req => {
    if (!/^[1-9]\d*$/.test(req.params.orderId) || !Number.isSafeInteger(Number(req.params.orderId))) throw fail(400, 'Invalid order number.');
    return Number(req.params.orderId);
  };
  app.post('/api/orders', requireUser, (req, res) => {
    const { items, shipping, requestKey } = req.body || {};
    if (typeof requestKey !== 'string' || !/^[a-zA-Z0-9-]{16,80}$/.test(requestKey)) throw fail(400, 'A checkout request key is required.');
    if (!Array.isArray(items) || !items.length || items.length > 50) throw fail(400, 'Your bag must contain 1–50 different watches.');
    const seen = new Set();
    for (const item of items) {
      if (!item || !Number.isSafeInteger(item.productId) || item.productId < 1 || !Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 99 || seen.has(item.productId)) throw fail(400, 'Invalid or duplicate bag item.');
      seen.add(item.productId);
    }
    const address = {};
    for (const field of ['name', 'phone', 'address', 'city', 'postalCode', 'country']) {
      if (typeof shipping?.[field] !== 'string' || !shipping[field].trim() || shipping[field].length > 300) throw fail(400, `Enter a valid shipping ${field}.`);
      address[field] = shipping[field].trim();
    }
    const fingerprint = JSON.stringify({ items: items.map(i => ({ productId: i.productId, quantity: i.quantity })).sort((a,b) => a.productId-b.productId), shipping: address });
    const result = transaction(db, () => {
      const previous = db.prepare('SELECT id, request_body FROM orders WHERE user_id = ? AND request_key = ?').get(req.user.id, requestKey);
      if (previous) {
        if (previous.request_body !== fingerprint) throw fail(409, 'This checkout key was already used for a different order. Refresh checkout.');
        return { order: getOrder(previous.id), repeated: true };
      }
      const lines = items.map(item => {
        const product = db.prepare('SELECT * FROM products WHERE id = ?').get(item.productId);
        if (!product || product.stock < item.quantity) throw fail(409, `${product?.title || 'A watch'} is unavailable in the requested quantity. Please update your bag.`);
        return { ...item, title: product.title, cents: Math.round(product.price * (1 - product.discountPercentage / 100) * 100) };
      });
      const total = lines.reduce((sum, line) => sum + line.cents * line.quantity, 0);
      if (!Number.isSafeInteger(total)) throw fail(400, 'Order total is too large.');
      const inserted = db.prepare('INSERT INTO orders (user_id, request_key, request_body, shipping, total_cents) VALUES (?, ?, ?, ?, ?)').run(req.user.id, requestKey, fingerprint, JSON.stringify(address), total);
      const id = Number(inserted.lastInsertRowid);
      for (const line of lines) {
        db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(line.quantity, line.productId);
        db.prepare('INSERT INTO order_items (order_id, product_id, title, unit_cents, quantity) VALUES (?, ?, ?, ?, ?)').run(id, line.productId, line.title, line.cents, line.quantity);
      }
      return { order: getOrder(id), repeated: false };
    });
    res.status(result.repeated ? 200 : 201).json(result.order);
  });
  app.get('/api/orders', requireUser, (req, res) => {
    const before = Number(req.query.before || Number.MAX_SAFE_INTEGER);
    if (!Number.isSafeInteger(before) || before < 1) throw fail(400, 'Invalid order page.');
    const orders = db.prepare('SELECT id FROM orders WHERE user_id = ? AND id < ? ORDER BY id DESC LIMIT 50').all(req.user.id, before).map(row => getOrder(row.id));
    res.json({ orders, nextBefore: orders.length === 50 ? orders.at(-1).id : null });
  });
  app.get('/api/orders/:orderId', requireUser, (req, res) => {
    const order = getOrder(orderId(req));
    if (order.user_id !== req.user.id && req.user.role !== 'admin') throw fail(404, 'Order not found.');
    res.json(order);
  });
  const cancel = order => {
    if (!['pending','processing'].includes(order.status) || order.payment_status !== 'unpaid') throw fail(409, 'Only unpaid orders awaiting shipment can be cancelled.');
    for (const line of order.items) if (line.product_id) db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?').run(line.quantity, line.product_id);
    db.prepare("UPDATE orders SET status = 'cancelled' WHERE id = ?").run(order.id);
  };
  app.post('/api/orders/:orderId/cancel', requireUser, (req, res) => {
    const order = transaction(db, () => {
      const current = getOrder(orderId(req));
      if (current.user_id !== req.user.id) throw fail(404, 'Order not found.');
      cancel(current); return getOrder(current.id);
    });
    res.json(order);
  });
  app.get('/api/admin/summary', requireUser, requireAdmin, (req, res) => {
    const totals = db.prepare(`SELECT count(*) AS orders, coalesce(sum(CASE WHEN status != 'cancelled' THEN total_cents ELSE 0 END),0) AS bookedCents,
      coalesce(sum(CASE WHEN payment_status = 'paid' THEN total_cents ELSE 0 END),0) AS paidCents,
      sum(CASE WHEN status IN ('pending','processing') THEN 1 ELSE 0 END) AS awaitingShipment FROM orders`).get();
    res.json({ ...totals, ...db.prepare('SELECT count(*) AS products, coalesce(sum(stock),0) AS units FROM products').get(),
      lowStock: db.prepare('SELECT id, title, stock FROM products WHERE stock <= 5 ORDER BY stock, id LIMIT 20').all(),
      dailySales: db.prepare("SELECT date(created_at) AS day, sum(total_cents) AS cents, count(*) AS orders FROM orders WHERE payment_status = 'paid' GROUP BY date(created_at) ORDER BY day DESC LIMIT 30").all(), storage: storageUsage(db) });
  });
  app.get('/api/admin/orders', requireUser, requireAdmin, (req, res) => {
    const before = Number(req.query.before || Number.MAX_SAFE_INTEGER);
    if (!Number.isSafeInteger(before) || before < 1) throw fail(400, 'Invalid order page.');
    const orders = db.prepare('SELECT id FROM orders WHERE id < ? ORDER BY id DESC LIMIT 50').all(before).map(row => getOrder(row.id));
    res.json({ orders, nextBefore: orders.length === 50 ? orders.at(-1).id : null });
  });
  app.patch('/api/admin/orders/:orderId', requireUser, requireAdmin, (req, res) => {
    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body) || !Object.keys(body).length || Object.keys(body).some(key => !['status','payment_status','tracking'].includes(key))) throw fail(400, 'Invalid order update.');
    res.json(transaction(db, () => {
      const order = getOrder(orderId(req));
      const transitions = { pending: ['processing','cancelled'], processing: ['shipped','cancelled'], shipped: ['delivered'], delivered: [], cancelled: [] };
      const status = body.status ?? order.status;
      if (status !== order.status && !transitions[order.status].includes(status)) throw fail(409, 'Invalid order status transition.');
      if (body.payment_status !== undefined && (body.payment_status !== 'paid' || status !== 'delivered')) throw fail(400, 'Cash on delivery can be marked paid only after delivery.');
      if (body.tracking !== undefined && (typeof body.tracking !== 'string' || body.tracking.length > 200)) throw fail(400, 'Invalid tracking reference.');
      if (status === 'cancelled' && order.status !== 'cancelled') cancel(order);
      db.prepare('UPDATE orders SET status = ?, payment_status = ?, tracking = ? WHERE id = ?').run(status, body.payment_status ?? order.payment_status, body.tracking ?? order.tracking, order.id);
      return getOrder(order.id);
    }));
  });
}
