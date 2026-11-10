// Compatibility adapter for the existing synchronous repositories. One worker owns
// one PostgreSQL connection; parameter values never become part of SQL text.
// This deliberately serializes database work. Use async repositories/pooling for scale.
import { Worker } from 'node:worker_threads';
import { readFileSync } from 'node:fs';
export function openPostgres(url) {
  const worker = new Worker(new URL('./postgres-worker.js', import.meta.url), { workerData: { url } });
  worker.on('error', error => console.error('PostgreSQL worker failed:', error.message));
  let active = false;
  function query(sql, params = []) {
    const shared = new SharedArrayBuffer(16 * 1024 * 1024 + 8);
    const state = new Int32Array(shared, 0, 2);
    worker.postMessage({ sql, params, shared });
    if (Atomics.wait(state, 0, 0, 30000) === 'timed-out') {
      void worker.terminate(); throw new Error('PostgreSQL request timed out; restart backend');
    }
    const result = JSON.parse(new TextDecoder().decode(new Uint8Array(shared, 8, Atomics.load(state, 1))));
    if (result.error) throw Object.assign(new Error(result.error), { code: result.code });
    return result;
  }
  function translate(sql) {
    let index = 0;
    return sql.replace(/\binstr\(/g, 'strpos(').replace(/'(?:''|[^'])*'|\?|\b(discountPercentage|bookedCents|paidCents|awaitingShipment)\b/g,
      (value, field) => value === '?' ? `$${++index}` : field ? `"${field}"` : value);
  }
  const db = {
    dialect: 'postgres',
    get isTransaction() { return active; },
    exec(sql) {
      if (sql === 'BEGIN IMMEDIATE') {
        query('BEGIN'); active = true;
        // Serialize commerce/security mutations across all instances of this app.
        query('SELECT pg_advisory_xact_lock(872451)'); return;
      }
      query(sql);
      if (sql === 'COMMIT' || sql === 'ROLLBACK') active = false;
    },
    prepare(sql) {
      const text = translate(sql);
      return {
        get: (...params) => query(text, params).rows[0],
        all: (...params) => query(text, params).rows,
        run: (...params) => {
          const returning = /^INSERT INTO (users|products|orders|order_items)\s*\(/i.test(text);
          const result = query(text + (returning ? ' RETURNING id' : ''), params);
          return { changes: result.changes, lastInsertRowid: result.rows[0]?.id };
        },
      };
    },
    close() { void worker.terminate(); },
  };
  try { db.exec(readFileSync(new URL('./schema.sql', import.meta.url), 'utf8')); }
  catch (error) { db.close(); throw error; }
  return db;
}
