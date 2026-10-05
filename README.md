# Watch Boutique

The project at `D:\watch\watch-boutique` has two independent applications:

```text
watch-boutique/
  frontend/
    src/                 Vue pages, components and composables
    public/              Images and other public assets
    package.json         Frontend dependencies and commands
    package-lock.json    Frontend dependency lockfile
    vite.config.ts       Frontend dev server and API proxy
    README.md
  backend/
    index.js             Express server entry point
    app.js               Authentication and product APIs
    auth.js              Password hashing and session helpers
    db.js                SQLite schema and database helpers
    data/                Existing SQLite database (ignored by Git)
    test/                Backend integration tests
    package.json         Backend dependencies and commands
    package-lock.json    Backend dependency lockfile
    .env.example         Backend environment configuration
    README.md
```

Use Node.js 24 or newer. Each folder has its own dependencies and can be installed separately. Existing root `node_modules` and `dist` folders are legacy generated files; the separated applications use their own installations and builds.

## Start backend — terminal 1

```powershell
cd D:\watch\watch-boutique\backend
npm.cmd ci
npm.cmd run dev
```

API: http://127.0.0.1:3000. The existing database was moved to `backend/data/boutique.sqlite`; users, sessions and products are preserved. On a fresh copy without a database, run `npm.cmd run db:seed` once from the backend folder to create six sample products.

## Start frontend — terminal 2

```powershell
cd D:\watch\watch-boutique\frontend
npm.cmd ci
npm.cmd run dev
```

Website: http://localhost:5173. The frontend proxies `/api` to the backend, so both servers must be running. Stop an old Vite server before starting the relocated frontend if port 5173 is already occupied. On Linux/macOS use `npm` instead of `npm.cmd`.

Register through the website to create an account. To grant product management access after registration, run `npm.cmd run admin -- your-email@example.com` from the backend folder. See `backend/README.md` for API routes and request examples. An administrator UI is not included.

## Check the projects

```powershell
cd D:\watch\watch-boutique\backend
npm.cmd test
cd ..\frontend
npm.cmd run build
```

The frontend production build is written to `frontend/dist`. Backend configuration belongs in `backend/.env`, using `backend/.env.example` as a template. Keep private `.env` files and the SQLite database out of Git. Docker setup remains a separate next step.
