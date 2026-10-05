import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export function openDatabase(filename = process.env.DATABASE_PATH || 'data/boutique.sqlite') {
  if (filename !== ':memory:') mkdirSync(dirname(resolve(filename)), { recursive: true });
  const db = new DatabaseSync(filename);
  db.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;
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
