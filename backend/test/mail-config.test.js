import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { createSecuritySender } from '../mail.js';
import { DEFAULT_DATABASE_PATH } from '../db.js';

test('configured relative database resolves to the same account store from different launch folders', () => {
  const moduleUrl = new URL('../db.js', import.meta.url).href;
  const result = execFileSync(process.execPath, ['--input-type=module', '-e', `import { configuredDatabasePath } from ${JSON.stringify(moduleUrl)}; console.log(configuredDatabasePath());`], {
    cwd: tmpdir(), env: { ...process.env, DATABASE_PATH: 'data/boutique.sqlite' }, encoding: 'utf8',
  });
  assert.equal(result.trim(), DEFAULT_DATABASE_PATH);
});

test('email sender rejects missing settings and reports safe provider failures without leaking response data', async () => {
  assert.equal(createSecuritySender({ RESEND_API_KEY: ' ', MAIL_FROM: 'test@example.com' }), null);
  const env = { RESEND_API_KEY: 'test-key', MAIL_FROM: 'test@example.com' };
  for (const status of [401, 403, 429, 500]) {
    const sender = createSecuritySender(env, async () => new Response('private provider details', { status }));
    await assert.rejects(sender({ email: 'recipient@example.com', subject: 'Test', text: 'Test', message_key: 'test' }), error => error.message.includes(`HTTP ${status}`) && !error.message.includes('private'));
  }
  let body;
  const sender = createSecuritySender(env, async (_, options) => {
    body = JSON.parse(options.body);
    assert.equal(options.headers['Idempotency-Key'], 'stable-key');
    return Response.json({ id: 'accepted' });
  });
  await sender({ email: 'recipient@example.com', subject: 'Reset', text: 'Link', message_key: 'stable-key' });
  assert.deepEqual(body.to, ['recipient@example.com']);
  assert.equal(body.from, env.MAIL_FROM);
});
