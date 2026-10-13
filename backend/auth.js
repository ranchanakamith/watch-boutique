import { randomBytes, scrypt, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';

const derive = promisify(scrypt);
export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const key = await derive(password, salt, 64);
  return `${salt}:${key.toString('hex')}`;
}
export async function verifyPassword(password, encoded) {
  const [salt, hash] = encoded.split(':');
  const actual = await derive(password, salt, 64);
  return timingSafeEqual(actual, Buffer.from(hash, 'hex'));
}
export const digest = value => createHash('sha256').update(value).digest('hex');
export const publicUser = row => ({ id: row.id, email: row.email, username: row.email, name: row.name, role: row.role,
  image: '/avatar.svg' });
export function readToken(req) {
  return (req.headers.cookie || '').split(';').map(part => part.trim()).find(part => part.startsWith('boutique_session='))?.slice('boutique_session='.length);
}
