import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// 80 MB main file + bounded rollback journal leaves ample headroom under 200 MB.
export const DATABASE_LIMIT_BYTES = 80_000_000;
export const DEFAULT_DATABASE_PATH = fileURLToPath(new URL('./data/boutique.sqlite', import.meta.url));

export function openDatabase(filename = process.env.DATABASE_PATH || DEFAULT_DATABASE_PATH) {
  if (filename !== ':memory:') mkdirSync(dirname(resolve(filename)), { recursive: true });
  const db = new DatabaseSync(filename);
  db.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = DELETE;
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY, email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      name TEXT NOT NULL, password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'customer' CHECK(role IN ('customer', 'admin')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, description TEXT NOT NULL,
      price REAL NOT NULL CHECK(price >= 0), discountPercentage REAL NOT NULL DEFAULT 0,
      rating REAL NOT NULL DEFAULT 0, stock INTEGER NOT NULL CHECK(stock >= 0),
      brand TEXT NOT NULL, category TEXT NOT NULL, thumbnail TEXT NOT NULL, images TEXT NOT NULL
    );
  `);
  const pageSize = db.prepare('PRAGMA page_size').get().page_size;
  db.exec(`PRAGMA max_page_count = ${Math.floor(DATABASE_LIMIT_BYTES / pageSize)}`);
  db.exec(`
    CREATE TABLE IF NOT EXISTS catalog_imports (
      source_key TEXT PRIMARY KEY, product_id INTEGER REFERENCES products(id) ON DELETE SET NULL
    );
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      request_key TEXT NOT NULL, request_body TEXT NOT NULL,
      shipping TEXT NOT NULL, total_cents INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','shipped','delivered','cancelled')),
      payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK(payment_status IN ('unpaid','paid')),
      tracking TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, request_key)
    );
    CREATE INDEX IF NOT EXISTS orders_user ON orders(user_id, id);
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY, order_id INTEGER NOT NULL REFERENCES orders(id),
      product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
      title TEXT NOT NULL, unit_cents INTEGER NOT NULL, quantity INTEGER NOT NULL CHECK(quantity > 0)
    );
    CREATE INDEX IF NOT EXISTS order_items_order ON order_items(order_id);
  `);
  return db;
}

export function productFromRow(row) {
  return row ? { ...row, images: JSON.parse(row.images) } : null;
}

export function insertProduct(db, product) {
  const fields = ['title', 'description', 'price', 'discountPercentage', 'rating', 'stock', 'brand', 'category', 'thumbnail', 'images'];
  const result = db.prepare(`INSERT INTO products (${fields.join(',')}) VALUES (${fields.map(() => '?').join(',')})`)
    .run(...fields.map(key => key === 'images' ? JSON.stringify(product[key]) : product[key]));
  return productFromRow(db.prepare('SELECT * FROM products WHERE id = ?').get(Number(result.lastInsertRowid)));
}
