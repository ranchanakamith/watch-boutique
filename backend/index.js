import { openDatabase } from './db.js';
import { createApp } from './app.js';
import { seedCatalog } from './seed.js';
import { createWelcomeSender, createWelcomeWorker } from './mail.js';

const db = openDatabase();
if (!db.prepare('SELECT 1 FROM products LIMIT 1').get() && !db.prepare('SELECT 1 FROM catalog_imports LIMIT 1').get()) seedCatalog(db);
const app = await createApp(db);
const sender = createWelcomeSender();
const mailWorker = createWelcomeWorker(db, sender);
if (!sender) console.warn('EMAIL DELIVERY DISABLED: configure RESEND_API_KEY and MAIL_FROM in backend/.env, then restart. Password recovery and verification cannot send mail. Run npm run mail:check for details.');
const processMail = () => Promise.all([mailWorker.run(), app.locals.accountSecurity.deliverMail()]).catch(() => console.error('Email worker failed; check local database availability.'));
const mailTimer = setInterval(processMail, 5000);
mailTimer.unref();
void processMail();
const host = process.env.HOST || (process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1');
const port = Number(process.env.PORT || 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be an integer between 1 and 65535.');
const server = app.listen(port, host, () => console.log(`Boutique API listening on ${host}:${port}`));
function shutdown() { clearInterval(mailTimer); server.close(async () => { await processMail(); db.close(); process.exit(0); }); }
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
