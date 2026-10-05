import { openDatabase } from './db.js';
import { createApp } from './app.js';

const db = openDatabase();
const app = await createApp(db);
const port = Number(process.env.PORT || 3000);
const server = app.listen(port, process.env.HOST || '127.0.0.1', () => console.log(`Boutique API listening on port ${port}`));
function shutdown() { server.close(() => { db.close(); process.exit(0); }); }
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
