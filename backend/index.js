import { openDatabase } from './db.js';
import { createApp } from './app.js';
import { seedCatalog } from './seed.js';
import { createWelcomeSender, createWelcomeWorker } from './mail.js';

const db = openDatabase();
if (!db.prepare('SELECT 1 FROM products LIMIT 1').get() && !db.prepare('SELECT 1 FROM catalog_imports LIMIT 1').get()) seedCatalog(db);
const app = await createApp(db);
const sender = createWelcomeSender();
const mailWorker = createWelcomeWorker(db, sender);
if (!sender) console.warn('Welcome emails are queued locally. Set RESEND_API_KEY and MAIL_FROM to enable sending.');
const processMail = () => mailWorker.run().catch(() => console.error('Welcome-email worker failed; check local database availability.'));
const mailTimer = setInterval(processMail, 5000);
mailTimer.unref();
void processMail();
const port = Number(process.env.PORT || 3000);
const server = app.listen(port, process.env.HOST || '127.0.0.1', () => console.log(`Boutique API listening on port ${port}`));
function shutdown() { clearInterval(mailTimer); server.close(async () => { await processMail(); db.close(); process.exit(0); }); }
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
