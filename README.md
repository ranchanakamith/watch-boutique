# Watch Boutique — local setup

Vue + Express + local SQLite. Node.js 24+ required.

## Start

Open two PowerShell terminals:

    cd D:\watch\watch-boutique\backend
    npm.cmd run dev

    cd D:\watch\watch-boutique\frontend
    npm.cmd run dev

Open http://localhost:5173. Run npm.cmd ci in each folder first if dependencies are missing. Restart old servers after updating.

## Admin

Register your own account through Sign In → Create an Account. Then run:

    cd D:\watch\watch-boutique\backend
    npm.cmd run admin -- your-email@example.com

Sign out and sign in again. Open http://localhost:5173/admin or use the Admin navigation link. There is no default admin password.

The dashboard supports product creation, editing and deletion; stock and discounts; orders and delivery details; tracking references; fulfillment status; collected sales; low-stock alerts; and local storage usage.

## Catalog and checkout

Eleven sample watches from https://dummyjson.com/docs/products are saved in backend/catalog.json and imported into SQLite. Existing products and accounts are preserved. These are demonstration descriptions, prices and stock, not verified supplier inventory. Review before taking real orders.

Run npm.cmd run db:seed from backend to import the bundled snapshot. This is repeatable: it preserves admin edits and deliberately deleted imported products. A fresh installation seeds automatically on first startup. Product browsing does not depend on the source API. Images are external URLs and require internet access.

Customers can search/filter, keep a browser-local bag and wishlist, change checkout quantities, enter shipping details, place cash-on-delivery orders, view their own orders and tracking, and cancel unpaid orders before shipment. Checkout validates current stock/prices, applies discounts and saves receipt snapshots. Duplicate requests with the same checkout key do not create another order.

Order workflow: pending → processing → shipped → delivered. Pending and processing orders can be cancelled, restoring stock once. Mark delivered orders paid only after collecting cash. Booked totals exclude cancellations; collected sales include only explicitly paid orders. Tracking references are entered manually; no carrier API is connected.

## Under 200 MB of application data

The default database is D:\watch\watch-boutique\backend\data\boutique.sqlite, independent of the directory you start Node from. SQLite max_page_count caps the main database at 80,000,000 bytes on every connection. DELETE journal mode prevents accumulating WAL files. A transaction journal can temporarily approach the database size; main file plus journal and the small bundled catalog remain below the 200,000,000-byte budget. Full-database writes return a clear 507 error.

No product images or videos are downloaded. The dashboard measures the database and SQLite companion files. This budget excludes source code, node_modules, builds, manually added public files and user-created backups. Those can exceed 200 MB independently. Do not switch to WAL without a separate WAL budget policy.

Stop the backend before copying the database for backup. Protect backups because they include customer delivery details; keep backups outside this data budget. Database and environment files are ignored by Git.

## Scope and remaining integrations

Checkout currently uses USD, cash on delivery, free shipping and no additional calculated tax. Configure real currency, shipping and tax requirements before commercial use. Card payments, refunds, carrier integration, order-status email notifications, image uploads, customer reviews and dedicated privacy/terms pages still need implementation. Existing policy content also needs review before launch. This is a local e-commerce foundation, not a fully deployed production service.

Password recovery, email verification and welcome emails are implemented; see backend/ACCOUNT-SECURITY.md. Contact inquiries use the configured Resend sender and require CONTACT_INBOX in addition to RESEND_API_KEY and MAIL_FROM. Without configuration, the form reports unavailable and offers direct contact. Provider acceptance is not a guarantee of inbox delivery. Track Order requires sign-in and uses the existing account-protected order endpoint. Tracking references are manually updated, not live courier locations. Signed-in bag/wishlist collections also persist in SQLite.

Before launch, the owner must supply real products/images/specifications and stock, currency and delivery prices/coverage, approved warranty/returns/privacy/terms content, verified business contact details, email sender credentials and inbox, payment-provider credentials if online payments are wanted, and hosting/domain access. Configure HTTPS, APP_ORIGIN and ACCOUNT_SECURITY_KEY; securely back up the database and its existing security key. Do not convert USD catalog amounts to another currency by merely changing the currency label. The shipping/returns/FAQ claims are sample content and require owner approval before accepting real orders.

## DevOps & Docker Deployment

The application includes an enterprise-grade multi-stage Docker setup and automated CI/CD pipeline:

### 1. One-Command Production Launch (Docker Compose)

Make sure Docker Desktop is running, then execute:

```powershell
docker compose up -d --build
```

- Application runs at: **http://localhost:3000**
- Healthcheck status can be inspected with: `docker ps`
- SQLite database persists in a named volume (`boutique_db_data`), surviving container restarts.

### 2. DevOps Architecture & Security Highlights

- **Multi-Stage Build**: Stage 1 builds the Vue 3 SPA with Node 24 Alpine; Stage 2 bundles only production dependencies and static assets.
- **CIS Benchmark Non-Root User**: The container drops root privileges and executes as the non-root `node` user (`USER node`).
- **Container Health Check Probe**: Automatically pings `/api/health` via `wget` every 30 seconds.
- **Automated CI/CD Pipeline** (`.github/workflows/devops-ci.yml`):
  1. Automated linting & 29 backend unit/integration tests
  2. Automated Vue frontend typecheck & production build
  3. Docker container build, spin-up, and live healthcheck smoke test.
- **Resource Constraints & Log Rotation**: Docker Compose limits CPU to 1.0, RAM to 512MB, and limits log files to 10MB x 3 to prevent disk exhaustion.

### 3. Granting Admin in Docker

Register your account on http://localhost:3000, then run:

```powershell
docker compose exec watch-boutique npm run admin -- your-email@example.com
```

Or set `INITIAL_ADMIN_EMAIL=your-email@example.com` in `docker-compose.yml` to automatically grant admin rights upon registration.

## Checks

    cd D:\watch\watch-boutique\backend
    npm.cmd test
    cd ..\frontend
    npm.cmd run build

Tests use isolated databases and cover authentication, access controls, checkout validation, overselling, retries, cancellations, fulfillment, collected sales, historical receipts, repeatable catalog import and storage limits. Changes remain local until committed and pushed.
