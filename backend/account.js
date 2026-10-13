import { productFromRow } from './db.js';
const fail = (status, message) => Object.assign(new Error(message), { status });
export function registerAccountRoutes(app, db, requireUser) {
  app.use('/api/account', requireUser, (req, res, next) => {
    if (req.headers['x-account-id'] !== String(req.user.id)) return next(fail(409, 'Your account changed. Refresh this page before continuing.'));
    next();
  });
  app.get('/api/account/items', (req, res) => {
    const rows = db.prepare(`SELECT p.*, a.kind, a.quantity FROM account_items a JOIN products p ON p.id = a.product_id WHERE a.user_id = ? ORDER BY p.id`).all(req.user.id);
    const result = { userId: req.user.id, cart: [], wishlist: [] };
    for (const { kind, quantity, ...row } of rows) {
      const product = productFromRow(row);
      result[kind].push(kind === 'cart' ? { ...product, quantity } : product);
    }
    res.json(result);
  });
  app.use('/api/account/items/:kind', (req, res, next) => {
    if (!['cart', 'wishlist'].includes(req.params.kind)) return next(fail(400, 'Invalid collection.'));
    next();
  });
  app.delete('/api/account/items/:kind', (req, res) => {
    db.prepare('DELETE FROM account_items WHERE user_id = ? AND kind = ?').run(req.user.id, req.params.kind);
    res.status(204).end();
  });
  app.put('/api/account/items/:kind/:productId', (req, res) => {
    const id = Number(req.params.productId);
    if (!Number.isSafeInteger(id) || id < 1) throw fail(400, 'Invalid watch.');
    const product = db.prepare('SELECT stock FROM products WHERE id = ?').get(id);
    if (!product) throw fail(404, 'This watch is no longer available.');
    const quantity = req.body?.quantity;
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99 || (req.params.kind === 'wishlist' && quantity !== 1)) throw fail(400, 'Invalid quantity.');
    if (req.params.kind === 'cart' && quantity > product.stock) throw fail(409, 'The requested quantity is not available.');
    const exists = db.prepare('SELECT 1 FROM account_items WHERE user_id = ? AND kind = ? AND product_id = ?').get(req.user.id, req.params.kind, id);
    const { total } = db.prepare('SELECT count(*) AS total FROM account_items WHERE user_id = ? AND kind = ?').get(req.user.id, req.params.kind);
    if (!exists && total >= 100) throw fail(400, 'You can save up to 100 watches per list.');
    db.prepare(`INSERT INTO account_items(user_id, kind, product_id, quantity) VALUES (?, ?, ?, ?) ON CONFLICT(user_id, kind, product_id) DO UPDATE SET quantity = excluded.quantity`).run(req.user.id, req.params.kind, id, quantity);
    res.status(204).end();
  });
  app.delete('/api/account/items/:kind/:productId', (req, res) => {
    const id = Number(req.params.productId);
    if (!Number.isSafeInteger(id) || id < 1) throw fail(400, 'Invalid watch.');
    db.prepare('DELETE FROM account_items WHERE user_id = ? AND kind = ? AND product_id = ?').run(req.user.id, req.params.kind, id);
    res.status(204).end();
  });
}
