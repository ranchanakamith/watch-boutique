import { parentPort, workerData } from 'node:worker_threads';
import pg from 'pg';
pg.types.setTypeParser(20, Number);
pg.types.setTypeParser(1700, Number);
const client = new pg.Client({ connectionString: workerData.url, connectionTimeoutMillis: 10000, statement_timeout: 15000 });
let connectionError;
const ready = client.connect().catch(error => { connectionError = error; });
client.on('error', error => { connectionError = error; });
parentPort.on('message', async ({ sql, params, shared }) => {
  const state = new Int32Array(shared, 0, 2);
  const output = new Uint8Array(shared, 8);
  let result;
  try {
    await ready;
    if (connectionError) throw connectionError;
    const response = await client.query(sql, params.length ? params : undefined);
    result = { rows: response.rows || [], changes: response.rowCount || 0 };
  } catch (error) { result = { error: error.message, code: error.code }; }
  let bytes = new TextEncoder().encode(JSON.stringify(result));
  if (bytes.length > output.length) bytes = new TextEncoder().encode(JSON.stringify({ error: 'Database response exceeds 16 MB limit' }));
  output.set(bytes); Atomics.store(state, 1, bytes.length); Atomics.store(state, 0, 1); Atomics.notify(state, 0);
});
