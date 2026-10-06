import { openDatabase } from './db.js';
import { createApp } from './app.js';
import { seedCatalog } from './seed.js';

const db = openDatabase();
if (!db.prepare('SELECT 1 FROM products LIMIT 1').get() && !db.prepare('SELECT 1 FROM catalog_imports LIMIT 1').get()) seedCatalog(db);
const app = await createApp(db);
const port = Number(process.env.PORT || 3000);
const server = app.listen(port, process.env.HOST || '127.0.0.1', () => console.log(`Boutique API listening on port ${port}`));
function shutdown() { server.close(() => { db.close(); process.exit(0); }); }
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
