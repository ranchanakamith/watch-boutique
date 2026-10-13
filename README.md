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

Checkout currently uses USD, cash on delivery, free shipping and no additional calculated tax. Configure real currency, shipping and tax requirements before commercial use. Card payments, refunds, carrier integration, email notifications, password reset/email verification, image uploads, customer reviews and legal-policy pages are not implemented. Existing contact/policy content also needs review before launch. This is a local e-commerce foundation, not a fully deployed production service.

## Checks

    cd D:\watch\watch-boutique\backend
    npm.cmd test
    cd ..\frontend
    npm.cmd run build

Tests use isolated databases and cover authentication, access controls, checkout validation, overselling, retries, cancellations, fulfillment, collected sales, historical receipts, repeatable catalog import and storage limits. Changes remain local until committed and pushed.
