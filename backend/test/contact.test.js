import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app.js';
import { openDatabase } from '../db.js';

async function fixture(t, options) {
  const db = openDatabase(':memory:');
  const app = await createApp(db, options);
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(async () => { await new Promise(resolve => server.close(resolve)); db.close(); });
  return (body, origin = 'http://localhost:5173') => fetch(`http://127.0.0.1:${server.address().port}/api/contact`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin }, body: JSON.stringify(body),
  });
}
const inquiry = { name: 'Customer', email: 'customer@example.com', message: 'Please check my order.' };
test('contact validates input, blocks cross-origin requests, sends only to configured inbox and rate limits', async t => {
  const messages = [];
  const request = await fixture(t, { contactInbox: 'store@example.com', contactSender: async message => messages.push(message) });
  assert.equal((await request(inquiry, 'https://other.example')).status, 403);
  assert.equal((await request({ ...inquiry, email: 'invalid' })).status, 400);
  assert.equal((await request({ ...inquiry, message: 'x'.repeat(5001) })).status, 400);
  assert.equal((await request({ ...inquiry, name: '   ' })).status, 400);
  assert.equal((await request(inquiry)).status, 200);
  assert.equal(messages.length, 1);
  assert.equal(messages[0].email, 'store@example.com');
  assert.match(messages[0].text, /customer@example.com/);
  assert.match(messages[0].text, /Please check my order/);
  assert.equal((await request(inquiry)).status, 200);
  assert.equal((await request(inquiry)).status, 429);
});
test('contact reports unavailable configuration and provider failure honestly', async t => {
  const unavailable = await fixture(t, { contactSender: null });
  assert.equal((await unavailable(inquiry)).status, 503);
  const failed = await fixture(t, { contactInbox: 'store@example.com', contactSender: async () => { throw new Error('private provider details'); } });
  const response = await failed(inquiry);
  assert.equal(response.status, 502);
  assert.doesNotMatch(await response.text(), /private provider details/);
});
