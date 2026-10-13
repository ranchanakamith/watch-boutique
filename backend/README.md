# Watch Boutique API

Express 5 and Node.js 24 built-in SQLite. Start with npm.cmd run dev. Optional .env settings: PORT (3000), HOST (127.0.0.1), APP_ORIGIN (http://localhost:5173), DATABASE_PATH, NODE_ENV. An explicit relative DATABASE_PATH resolves from the process working directory; otherwise the default is backend/data/boutique.sqlite relative to db.js.

Authentication uses salted scrypt hashes and HttpOnly, SameSite=Strict cookies. Production cookies require HTTPS. Frontend and API share an origin via the Vite proxy or a production reverse proxy. Roles are checked from the database on every request.

| Method | Route | Access / behavior |
| --- | --- | --- |
| GET | /api/health | Public health |
| POST | /api/auth/register | email, name, password; creates customer only |
| POST | /api/auth/login | email, password |
| GET | /api/auth/me | Current user |
| POST | /api/auth/logout | Revoke session |
| GET | /api/products | Public; q, category, limit (1–100), skip |
| GET | /api/products/:id | Public product |
| POST | /api/products | Admin create |
| PATCH | /api/products/:id | Admin update |
| DELETE | /api/products/:id | Admin delete; old receipts remain |
| POST | /api/orders | Signed-in checkout |
| GET | /api/orders | Own orders; optional before cursor, 50 per page |
| GET | /api/orders/:orderId | Owner or admin |
| POST | /api/orders/:orderId/cancel | Owner; unpaid pending/processing only |
| GET | /api/admin/summary | Admin sales, stock, storage |
| GET | /api/admin/orders | Admin; optional before cursor, 50 per page |
| PATCH | /api/admin/orders/:orderId | Admin status, payment_status, tracking |

Product fields: title, description, price, discountPercentage, rating, stock, brand, category, thumbnail, images. Rating/discount default to zero. Image paths must be HTTP(S) URLs or local public paths. No uploads. Do not include id in product edits.

Checkout body: requestKey (16–80 alphanumeric/hyphen characters), items (array of {productId, quantity}), shipping ({name, phone, address, city, postalCode, country}). Retry the identical body using the same key after a network failure. A changed body with a reused key returns 409. Prices/totals supplied by clients are ignored. Integer cents come from current prices and discounts. Maximum 50 distinct products and 99 units per line. Insufficient stock returns 409; stock and order writes are atomic.

Orders contain items, total_cents, currency USD, cash_on_delivery payment method, status, payment_status, shipping, tracking and UTC created_at. Lists return orders and nextBefore. Daily sales use order creation dates for paid orders, not payment collection dates.

Forward statuses: pending → processing → shipped → delivered. Cancel before shipment to restore stock once. payment_status becomes paid only after delivery. Paid orders cannot be reverted or cancelled; refunds require a separate workflow. Revenue is never assumed from uncollected orders.

SQLite has an 80 MB main-file cap and DELETE journal mode, keeping the database plus temporary journal below the 200 MB data budget. Errors return 507 when full. Dependencies, builds, backups and manually added files are outside that budget. catalog_imports retains provenance so seed never silently restores deliberately deleted products.

Run npm.cmd run db:seed to import the bundled catalog, and npm.cmd run admin -- registered-email@example.com to grant admin access. See the root README for setup and limits.
