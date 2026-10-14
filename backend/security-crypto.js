import { randomBytes, createCipheriv, createDecipheriv, createHmac, timingSafeEqual } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export function securityKey(production) {
  const configured = process.env.ACCOUNT_SECURITY_KEY;
  if (configured) {
    if (!/^[a-f0-9]{64}$/i.test(configured)) throw new Error('ACCOUNT_SECURITY_KEY must contain 64 hexadecimal characters.');
    return Buffer.from(configured, 'hex');
  }
  if (production) throw Object.assign(new Error('Account security is unavailable until the server security key is configured.'), { status: 503 });
  const folder = fileURLToPath(new URL('./data/', import.meta.url));
  const path = fileURLToPath(new URL('./data/account-security.key', import.meta.url));
  mkdirSync(folder, { recursive: true });
  try { writeFileSync(path, randomBytes(32), { flag: 'wx', mode: 0o600 }); }
  catch (error) { if (error.code !== 'EEXIST') throw error; }
  const key = readFileSync(path);
  if (key.length !== 32) throw new Error('Invalid account security key file.');
  return key;
}
export function encrypt(value, key) {
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key, iv);
  return Buffer.concat([iv, cipher.update(value, 'utf8'), cipher.final(), cipher.getAuthTag()]).toString('base64');
}
export function decrypt(value, key) {
  const data = Buffer.from(value, 'base64');
  const decipher = createDecipheriv('aes-256-gcm', key, data.subarray(0, 12));
  decipher.setAuthTag(data.subarray(-16));
  return Buffer.concat([decipher.update(data.subarray(12, -16)), decipher.final()]).toString('utf8');
}
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export function newTotpSecret() {
  let bits = '', result = '';
  for (const byte of randomBytes(20)) bits += byte.toString(2).padStart(8, '0');
  for (let i = 0; i < bits.length; i += 5) result += alphabet[parseInt(bits.slice(i, i + 5), 2)];
  return result;
}
// RFC 6238: HMAC-SHA1, a 30-second step, and six digits for authenticator apps.
export function totp(secret, step, digits = 6) {
  const bits = [...secret].map(c => alphabet.indexOf(c).toString(2).padStart(5, '0')).join('');
  const bytes = Buffer.from(bits.match(/.{8}/g).map(byte => parseInt(byte, 2)));
  const counter = Buffer.alloc(8); counter.writeBigUInt64BE(BigInt(step));
  const hash = createHmac('sha1', bytes).update(counter).digest();
  const offset = hash[hash.length - 1] & 15;
  return ((hash.readUInt32BE(offset) & 0x7fffffff) % 10 ** digits).toString().padStart(digits, '0');
}
export function matchTotp(secret, code, now, lastStep = -1) {
  if (typeof code !== 'string' || !/^\d{6}$/.test(code)) return null;
  const current = Math.floor(now / 30000);
  for (const step of [current, current - 1, current + 1]) {
    if (step > lastStep && timingSafeEqual(Buffer.from(totp(secret, step)), Buffer.from(code))) return step;
  }
  return null;
}
