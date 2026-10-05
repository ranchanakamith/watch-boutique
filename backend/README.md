# Watch Boutique backend

This folder is an independent Express API package. SQLite stores users, hashed passwords, sessions and products in `data/boutique.sqlite`. Use Node.js 24 or newer. No separate database installation is needed. The Vue app lives in the sibling `frontend` folder.

## Start on Windows

Run in PowerShell:

```powershell
cd D:\watch\watch-boutique\backend
npm.cmd install
# Optional: copy .env.example to .env if you need custom settings.
npm.cmd run db:seed
npm.cmd run dev
```

The API listens on http://127.0.0.1:3000. In a second terminal run `npm.cmd install` and `npm.cmd run dev` from `D:\watch\watch-boutique\frontend`, then open http://localhost:5173. Vite forwards `/api` requests to this backend. Both servers must be running. `npm.cmd` avoids the PowerShell execution-policy restriction on `npm.ps1`. On Linux/macOS use `npm` instead.

The seed command creates six clearly labelled demonstration watches, with local placeholder images, only if the product table is empty. It never overwrites existing products. Replace the sample listings with your inventory using the administrator API. Prices are numeric amounts displayed using the storefront's existing currency formatting.

Use Create Account in the app, then sign in with your email and password. Passwords must contain 8–128 characters; spaces are preserved. Previous local demo accounts and DummyJSON credentials do not work. Legacy plaintext credentials are removed from browser storage; register a new account. There are no default administrator credentials.

## Administrator access

Register an account first, then grant access from a trusted terminal:

```powershell
npm.cmd run admin -- your-email@example.com
```

The API checks the database role on every request. Registering a user through the API can never grant administrator access. There is no administrator dashboard in this change; use the API to manage products.

## API

All request and response bodies use JSON. Errors use `{ "message": "..." }`. Authentication uses an HttpOnly, SameSite=Strict session cookie; fetch clients should use `credentials: 'same-origin'`. Session tokens are hashed in the database and expire after seven days. Logout revokes the current session. Passwords are salted and hashed with scrypt.

| Method | Path | Access / body |
| --- | --- | --- |
| GET | `/api/health` | Database health |
| POST | `/api/auth/register` | `{ "email", "password", "name" }`; also signs in |
| POST | `/api/auth/login` | `{ "email", "password" }` |
| GET | `/api/auth/me` | Current signed-in user |
| POST | `/api/auth/logout` | Revokes current session |
| GET | `/api/products` | Public; optional `q`, `category`, `limit` (1–100), `skip` |
| GET | `/api/products/:id` | Public single product |
| POST | `/api/products` | Administrator; creates product |
| PATCH | `/api/products/:id` | Administrator; updates supplied fields |
| DELETE | `/api/products/:id` | Administrator; deletes product |

List responses contain `{ products, total, skip, limit }`. Single-product and write responses contain the product itself. Products sort by descending price. The frontend fetches every page for its existing client-side filters.

Example product body:

```json
{
  "title": "Heritage Automatic",
  "description": "Stainless steel automatic watch with leather strap.",
  "price": 1250,
  "discountPercentage": 0,
  "rating": 0,
  "stock": 12,
  "brand": "Boutique",
  "category": "mens-watches",
  "thumbnail": "/sample-watch.svg",
  "images": ["/sample-watch.svg"]
}
```

`rating` and `discountPercentage` default to zero. All other fields above are required when creating a product. Use `mens-watches` and `womens-watches` for the existing storefront collection links. Images can be local public paths or HTTP(S) URLs; image uploading is not implemented.

Example in the browser console at localhost:5173, after signing in as an administrator:

```js
await fetch('/api/products/1', {
  method: 'PATCH',
  credentials: 'same-origin',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ price: 1190, stock: 8 })
}).then(response => response.json())
```

## Configuration and deployment preparation

The backend `.env` is optional. Scripts load it automatically. `DATABASE_PATH` is relative to the backend directory unless absolute. `PORT` defaults to 3000, `HOST` to 127.0.0.1, and `APP_ORIGIN` to http://localhost:5173. If you change the API port, update both proxy targets in `../frontend/vite.config.ts`. If you change the browser origin, update `APP_ORIGIN` to the exact scheme, hostname and port.

For deployment, serve the frontend and `/api` on the same HTTPS origin through a reverse proxy and set `NODE_ENV=production`, `APP_ORIGIN` to that origin. Production cookies require HTTPS. The API does not serve the built frontend. Do not use Vite's development server as your production host. Keep the database private and back it up; stop the API before copying the database file so WAL changes are included. Environment files and database files are ignored by Git.

Docker is deferred to the next step. A later container setup should use Node 24+, bind the API to `0.0.0.0`, and mount a persistent volume for the SQLite database. This implementation is intended for one API instance; the authentication rate limiter is process-local. Horizontal scaling requires shared rate limiting and revisiting database architecture.

Orders, payments, password reset and email verification are not implemented. The existing cart and wishlist remain browser-local.

## Verification

```powershell
npm.cmd test
npm.cmd --prefix ../frontend run build
```

Backend tests use isolated temporary databases and cover registration, hashing, login failures, cookie settings, session revocation and expiry, cross-origin rejection, rate limiting, product permissions and validation, filtering and pagination, and persistence across restarts. They do not modify the development database.
