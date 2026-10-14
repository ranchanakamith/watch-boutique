import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { openDatabase } from '../db.js';
import { createApp } from '../app.js';
import { totp, encrypt, decrypt } from '../security-crypto.js';
import { createSecuritySender } from '../mail.js';

const account = { name: 'Security Test', email: 'security@example.com', password: 'a long original password' };
const tokenFrom = mail => new URL(mail.text.match(/https?:\/\/\S+/)[0]).hash.slice('#token='.length);
async function fixture(t, { production = false, sender, db: providedDb } = {}) {
  const db = providedDb || openDatabase(':memory:');
  const messages = [], key = randomBytes(32);
  let clock = Date.now();
  const app = await createApp(db, { production, security: { key, now: () => clock, sender: sender === undefined ? async mail => messages.push(mail) : sender } });
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(async () => { await new Promise(resolve => server.close(resolve)); db.close(); });
  const request = async (path, { body, method = body === undefined ? 'GET' : 'POST', cookie, headers = {} } = {}) => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}${path.startsWith('/api/') ? path : `/api/auth${path}`}`, {
      method, headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(cookie ? { Cookie: cookie } : {}), ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: response.status, cookie: response.headers.get('set-cookie')?.split(';')[0], data: response.status === 204 ? null : await response.json() };
  };
  return { db, key, request, app, messages, now: () => clock, advance: milliseconds => { clock += milliseconds; }, send: () => app.locals.accountSecurity.deliverMail() };
}
async function enroll(f, cookie) {
  const setup = await f.request('/security/mfa/setup', { cookie, body: { currentPassword: account.password } });
  assert.equal(setup.status, 200);
  const secret = setup.data.secret;
  const enabled = await f.request('/security/mfa/enable', { cookie, body: { currentPassword: account.password, code: totp(secret, Math.floor(f.now() / 30000)) } });
  assert.equal(enabled.status, 200);
  return { secret, cookie: enabled.cookie, codes: enabled.data.recoveryCodes };
}

test('TOTP implementation matches independent RFC 6238 SHA1 test vectors; encryption detects tampering', () => {
  const secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
  for (const [seconds, code] of [[59,'94287082'], [1111111109,'07081804'], [1111111111,'14050471'], [1234567890,'89005924'], [2000000000,'69279037'], [20000000000,'65353130']]) {
    assert.equal(totp(secret, Math.floor(seconds / 30), 8), code);
  }
  const key = randomBytes(32), encoded = encrypt('private payload', key);
  assert.equal(decrypt(encoded, key), 'private payload');
  assert.throws(() => decrypt(encoded, randomBytes(32)));
});

test('reset responses do not disclose accounts, secrets are encrypted, reset revokes every session and token is single-use', async t => {
  const f = await fixture(t);
  const registration = await f.request('/register', { body: account });
  const login = await f.request('/login', { body: account });
  const known = await f.request('/forgot-password', { body: { email: `  ${account.email.toUpperCase()}  ` }, headers: { Host: 'attacker.example' } });
  const unknown = await f.request('/forgot-password', { body: { email: 'nobody@example.com' } });
  assert.equal(known.status, 202); assert.deepEqual(known.data, unknown.data);
  const pending = f.db.prepare('SELECT payload FROM security_mail').get().payload;
  assert.ok(!pending.includes(account.email));
  await f.send();
  assert.equal(f.messages.length, 1);
  assert.match(f.messages[0].text, /http:\/\/localhost:5173\/account\/reset-password#token=/);
  assert.ok(!f.messages[0].text.includes('attacker.example'));
  const token = tokenFrom(f.messages[0]);
  assert.notEqual(f.db.prepare('SELECT token_hash FROM security_tokens').get().token_hash, token);
  assert.equal(f.db.prepare('SELECT payload FROM security_mail').get().payload, null);
  const reset = await f.request('/reset-password', { body: { token, password: 'new password with spaces ' } });
  assert.equal(reset.status, 200);
  for (const cookie of [registration.cookie, login.cookie]) assert.equal((await f.request('/me', { cookie })).status, 401);
  assert.equal((await f.request('/reset-password', { body: { token, password: 'another password' } })).status, 400);
  assert.equal((await f.request('/login', { body: account })).status, 401);
  assert.equal((await f.request('/login', { body: { ...account, password: 'new password with spaces ' } })).status, 200);
});

test('expired, superseded and concurrent reset links fail safely; mail request cooldown prevents floods', async t => {
  const f = await fixture(t);
  await f.request('/register', { body: account });
  await f.request('/forgot-password', { body: { email: account.email } }); await f.send();
  const old = tokenFrom(f.messages[0]);
  await f.request('/forgot-password', { body: { email: account.email } }); await f.send();
  assert.equal(f.messages.length, 1);
  f.advance(61000);
  await f.request('/forgot-password', { body: { email: account.email } }); await f.send();
  assert.equal((await f.request('/reset-password', { body: { token: old, password: 'replacement password' } })).status, 400);
  const expired = tokenFrom(f.messages[1]); f.advance(31 * 60000);
  assert.equal((await f.request('/reset-password', { body: { token: expired, password: 'replacement password' } })).status, 400);
  await f.request('/forgot-password', { body: { email: account.email } }); await f.send();
  const token = tokenFrom(f.messages.at(-1));
  const results = await Promise.all([1,2].map(() => f.request('/reset-password', { body: { token, password: 'replacement password' } })));
  assert.deepEqual(results.map(r => r.status).sort(), [200,400]);
});

test('verification requires a live single-use token, preserves sessions, and does not leak tokens to responses', async t => {
  const f = await fixture(t);
  const { cookie } = await f.request('/register', { body: account });
  assert.equal((await f.request('/me', { cookie })).data.user.emailVerified, false);
  assert.equal((await f.request('/security/send-verification', { body: {} })).status, 401);
  const sent = await f.request('/security/send-verification', { cookie, body: {} });
  assert.equal(sent.status, 202); assert.equal(sent.data.token, undefined);
  await f.send(); const token = tokenFrom(f.messages[0]);
  assert.equal((await f.request('/reset-password', { body: { token, password: 'new valid password' } })).status, 400);
  assert.equal((await f.request('/verify-email', { body: { token } })).status, 200);
  assert.equal((await f.request('/verify-email', { body: { token } })).status, 400);
  assert.equal((await f.request('/me', { cookie })).data.user.emailVerified, true);
});

test('password changes require current password, and session revocation is scoped to the signed-in account', async t => {
  const f = await fixture(t);
  const a = await f.request('/register', { body: account });
  const b = await f.request('/login', { body: account });
  const other = await f.request('/register', { body: { ...account, email: 'other@example.com' } });
  const sessions = (await f.request('/security', { cookie: a.cookie })).data.sessions;
  assert.equal(sessions.length, 2); assert.equal(sessions.filter(s=>s.current).length, 1);
  const target = sessions.find(s=>!s.current).id;
  assert.equal((await f.request(`/security/sessions/${target}`, { method:'DELETE', cookie: other.cookie })).status, 404);
  assert.equal((await f.request(`/security/sessions/${target}`, { method:'DELETE', cookie: a.cookie })).status, 204);
  assert.equal((await f.request('/me', { cookie: b.cookie })).status, 401);
  assert.equal((await f.request('/security/change-password', { cookie: a.cookie, body: { currentPassword: 'wrong', password: 'new long password' } })).status, 401);
  assert.equal((await f.request('/security/change-password', { cookie: a.cookie, body: { currentPassword: account.password, password: 'new long password' } })).status, 200);
  assert.equal((await f.request('/me', { cookie: a.cookie })).status, 401);
  assert.equal((await f.request('/me', { cookie: other.cookie })).status, 200);
  const c = await f.request('/login', { body: { ...account, password: 'new long password' } });
  assert.equal((await f.request('/security/logout-all', { cookie: c.cookie, body: {} })).status, 204);
  assert.equal((await f.request('/me', { cookie: c.cookie })).status, 401);
});

test('MFA enrollment, replay protection, recovery-code reuse, challenge limits and reset cannot bypass MFA', async t => {
  const f = await fixture(t);
  const initial = await f.request('/register', { body: account });
  const enrolled = await enroll(f, initial.cookie);
  assert.equal(enrolled.codes.length, 10);
  assert.equal((await f.request('/me', { cookie: initial.cookie })).status, 401);
  assert.notEqual(f.db.prepare('SELECT mfa_secret FROM users').get().mfa_secret, enrolled.secret);
  assert.notEqual(f.db.prepare('SELECT code_hash FROM recovery_codes LIMIT 1').get().code_hash, enrolled.codes[0]);
  const start = await f.request('/login', { body: account });
  assert.equal(start.data.mfaRequired, true); assert.equal(start.cookie, undefined); assert.equal(start.data.user, undefined);
  const used = totp(enrolled.secret, Math.floor(f.now()/30000));
  assert.equal((await f.request('/mfa/login', { body: { challenge: start.data.challenge, code: used } })).status, 401);
  f.advance(30000);
  const signedIn = await f.request('/mfa/login', { body: { challenge: start.data.challenge, code: totp(enrolled.secret, Math.floor(f.now()/30000)) } });
  assert.equal(signedIn.status, 200); assert.ok(signedIn.cookie);
  assert.equal((await f.request('/mfa/login', { body: { challenge: start.data.challenge, code: enrolled.codes[0] } })).status, 401);
  const next = await f.request('/login', { body: account });
  assert.equal((await f.request('/mfa/login', { body: { challenge: next.data.challenge, code: enrolled.codes[0] } })).status, 200);
  const third = await f.request('/login', { body: account });
  assert.equal((await f.request('/mfa/login', { body: { challenge: third.data.challenge, code: enrolled.codes[0] } })).status, 401);
  for (let i=0;i<4;i++) assert.equal((await f.request('/mfa/login', { body: { challenge: third.data.challenge, code: 'bad' } })).status, 401);
  assert.equal((await f.request('/mfa/login', { body: { challenge: third.data.challenge, code: enrolled.codes[1] } })).status, 401);
  await f.request('/forgot-password', { body: { email: account.email } }); await f.send();
  assert.equal((await f.request('/reset-password', { body: { token: tokenFrom(f.messages[0]), password: 'a reset password' } })).status, 200);
  assert.equal((await f.request('/me', { cookie: signedIn.cookie })).status, 401);
  const afterReset = await f.request('/login', { body: { ...account, password: 'a reset password' } });
  assert.equal(afterReset.data.mfaRequired, true);
});

test('MFA disable needs password and a second factor, while production administrators cannot disable it', async t => {
  const f = await fixture(t);
  const initial = await f.request('/register', { body: account });
  const enrolled = await enroll(f, initial.cookie);
  assert.equal((await f.request('/security/mfa/disable', { cookie: enrolled.cookie, body: { currentPassword: account.password } })).status, 401);
  const disabled = await f.request('/security/mfa/disable', { cookie: enrolled.cookie, body: { currentPassword: account.password, code: enrolled.codes[0] } });
  assert.equal(disabled.status, 200);
  assert.equal((await f.request('/login', { body: account })).data.mfaRequired, undefined);
  const prod = await fixture(t, { production: true });
  const admin = await prod.request('/register', { body: account });
  prod.db.prepare("UPDATE users SET role='admin'").run();
  assert.equal((await prod.request('/security', { cookie: admin.cookie })).data.adminMfaRequired, true);
  assert.equal((await prod.request('/security/mfa/disable', { cookie: admin.cookie, body: { currentPassword: account.password } })).status, 403);
});

test('missing email configuration returns an honest, account-independent error and no token', async t => {
  const f = await fixture(t, { sender: null });
  const { cookie } = await f.request('/register', { body: account });
  for (const email of [account.email,'unknown@example.com']) assert.equal((await f.request('/forgot-password', { body:{email} })).status, 503);
  assert.equal((await f.request('/security/send-verification', { cookie, body:{} })).status, 503);
  assert.equal(f.db.prepare('SELECT count(*) AS n FROM security_tokens').get().n, 0);
});

test('production administrator routes require verified email and an MFA-authenticated session', async t => {
  const f = await fixture(t, { production: true });
  const initial = await f.request('/register', { body: account });
  f.db.prepare("UPDATE users SET role='admin'").run();
  assert.equal((await f.request('/api/admin/summary', { cookie: initial.cookie })).status, 403);
  const enrolled = await enroll(f, initial.cookie);
  assert.equal((await f.request('/api/admin/summary', { cookie: enrolled.cookie })).status, 403);
  await f.request('/security/send-verification', { cookie: enrolled.cookie, body: {} }); await f.send();
  await f.request('/verify-email', { body: { token: tokenFrom(f.messages[0]) } });
  assert.equal((await f.request('/api/admin/summary', { cookie: enrolled.cookie })).status, 200);
  f.db.prepare('UPDATE sessions SET mfa_verified=0').run();
  assert.equal((await f.request('/api/admin/summary', { cookie: enrolled.cookie })).status, 403);
});

test('MFA enrollment expires, unauthenticated security actions fail, and cross-origin recovery is rejected', async t => {
  const f = await fixture(t);
  assert.equal((await f.request('/security')).status, 401);
  assert.equal((await f.request('/security/logout-all', { body: {} })).status, 401);
  assert.equal((await f.request('/forgot-password', { body: { email: account.email }, headers: { Origin: 'https://attacker.example' } })).status, 403);
  const initial = await f.request('/register', { body: account });
  const setup = await f.request('/security/mfa/setup', { cookie: initial.cookie, body: { currentPassword: account.password } });
  f.advance(11 * 60000);
  assert.equal((await f.request('/security/mfa/enable', { cookie: initial.cookie, body: { currentPassword: account.password, code: totp(setup.data.secret, Math.floor(f.now()/30000)) } })).status, 400);
  const enrolled = await enroll(f, initial.cookie);
  const challenge = await f.request('/login', { body: account });
  f.advance(6 * 60000);
  assert.equal((await f.request('/mfa/login', { body: { challenge: challenge.data.challenge, code: enrolled.codes[0] } })).status, 401);
  assert.equal(f.db.prepare('SELECT count(*) AS total FROM recovery_codes').get().total, 10);
});

test('mail retry uses stable idempotency key, avoids duplicate sends and retains no plaintext secrets', async t => {
  const attempts=[];
  const f = await fixture(t, { sender: async mail => { attempts.push(mail); if(attempts.length===1) throw Error('temporary failure'); } });
  await f.request('/register', { body:account });
  await f.request('/forgot-password', { body:{email:account.email} });
  await Promise.all([f.send(), f.send()]); assert.equal(attempts.length,1);
  await f.send(); assert.equal(attempts.length,1);
  f.advance(121000); await f.send(); assert.equal(attempts.length,2);
  assert.equal(attempts[0].message_key, attempts[1].message_key);
  assert.equal(attempts[0].text, attempts[1].text);
  assert.equal(f.db.prepare('SELECT payload FROM security_mail').get().payload,null);
  let sent;
  const sender=createSecuritySender({RESEND_API_KEY:'test-key',MAIL_FROM:'store@example.com'},async(url,options)=>{sent={url,options};return {ok:true,json:async()=>({id:'test-id'})};});
  await sender(attempts[0]);
  assert.equal(sent.url,'https://api.resend.com/emails');
  assert.equal(sent.options.headers['Idempotency-Key'],attempts[0].message_key);
});

test('additive migration preserves legacy users, sessions, and data across reopens', () => {
  const directory=mkdtempSync(join(tmpdir(),'boutique-security-'));
  const path=join(directory,'legacy.sqlite');
  try {
    const legacy=new DatabaseSync(path);
    legacy.exec(`CREATE TABLE users(id INTEGER PRIMARY KEY,email TEXT NOT NULL UNIQUE COLLATE NOCASE,name TEXT NOT NULL,password_hash TEXT NOT NULL,role TEXT NOT NULL DEFAULT 'customer',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE sessions(token_hash TEXT PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES users(id),expires_at INTEGER NOT NULL);
      INSERT INTO users(id,email,name,password_hash) VALUES(1,'legacy@example.com','Legacy','existing-hash');
      INSERT INTO sessions VALUES('existing-session',1,9999999999999);`);
    legacy.close();
    for(let i=0;i<2;i++) {
      const db=openDatabase(path);
      assert.equal(db.prepare('SELECT name FROM users WHERE id=1').get().name,'Legacy');
      assert.equal(db.prepare('SELECT mfa_verified FROM sessions').get().mfa_verified,0);
      assert.equal(db.prepare('SELECT email_verified_at FROM users').get().email_verified_at,null);
      db.close();
    }
  } finally {rmSync(directory,{recursive:true,force:true});}
});
