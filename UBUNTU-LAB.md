# Ubuntu lab deployment

Install Docker Engine + Compose plugin first. Run commands from the cloned repository root. Initial builds need internet.

## Option A: PostgreSQL container, three services
```bash
docker compose up -d --build
docker compose ps
```
Open http://localhost:8080 (HTTP). Separate frontend, backend and PostgreSQL containers. Only frontend is published, on localhost.

## Option B: Neon online PostgreSQL
Create a project in Neon and choose a region near the lab. In Connect, select the database and copy the direct PostgreSQL connection string (disable connection pooling). Keep its TLS parameters.
```bash
cp .env.example .env
nano .env
```
Add DATABASE_URL with that connection string. Do not commit or share .env.
```bash
docker compose -f compose.online.yml up -d --build
```
Open http://localhost:8080. This option runs frontend and backend containers; PostgreSQL is hosted by Neon, so no database container is needed. Use a dedicated new database. The backend creates tables and seeds demo watches. It does not create your Neon account/project.

## Administrator
Register your email in the website, then run the matching command:
```bash
# Local PostgreSQL:
docker compose exec backend npm run admin -- ranchanakamith@gmail.com
# Neon:
docker compose -f compose.online.yml exec backend npm run admin -- ranchanakamith@gmail.com
```
Sign out and sign in again. Existing SQLite accounts/orders are not migrated. Your original SQLite files remain untouched. Register a new account in PostgreSQL.

## Configuration and persistence
The default is a local HTTP lab demo in development mode. Production public hosting requires HTTPS, NODE_ENV=production, APP_ORIGIN, a stable ACCOUNT_SECURITY_KEY (64 hex characters), and email delivery; production admin tools require email verification and MFA. Change the sample database password before public hosting.

PostgreSQL container data and account security keys persist in named volumes. Neon data stays in Neon; keep the security volume/key safe when moving computers. Do not run `down -v` unless you intend to delete volumes. Set the same ACCOUNT_SECURITY_KEY securely on different machines sharing a Neon database before using account-security features.

If changing WEB_PORT, also update APP_ORIGIN. backend/.env and local database files are excluded from images.

```bash
docker compose logs --tail=100 backend
docker compose down
```
For Neon, add `-f compose.online.yml` to each Compose command. Do not run both options concurrently on port 8080. Push the changes to GitHub before pulling them on the lab computer.

## Files
frontend/Dockerfile and nginx.conf: Vue/Nginx with API proxy and SPA routing.
backend/Dockerfile: Express API runtime.
backend/database/schema.sql: repeatable PostgreSQL schema.
backend/database/postgres.js and postgres-worker.js: PostgreSQL adapter.
database/Dockerfile: official PostgreSQL 17 image.

SQLite remains the local-development fallback without DATABASE_URL. The PostgreSQL adapter retains the synchronous repository interface using a worker connection. Database work serializes and blocks request processing while waiting; this lab-oriented implementation should be refactored to asynchronous repositories/pooling before scaling. Values are parameterized and transaction writes use an advisory lock.

## Tests
`cd backend && npm test` runs SQLite regression tests.
`docker compose exec backend node test/postgres.integration.js` runs PostgreSQL integration checks in an isolated temporary schema.
