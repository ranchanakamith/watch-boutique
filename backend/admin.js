import { openDatabase } from './db.js';

const email = process.argv[2]?.trim().toLowerCase();
if (!email) throw new Error('Usage: npm run admin -- registered-email@example.com');
const db = openDatabase();
try {
  const result = db.prepare("UPDATE users SET role = 'admin' WHERE email = ?").run(email);
  if (!result.changes) throw new Error('Register this email in the app first.');
  console.log(`Administrator access granted to ${email}. Sign in with this account to manage products.`);
} finally { db.close(); }
