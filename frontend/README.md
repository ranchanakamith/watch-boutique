# Watch Boutique frontend

Independent Vue/Vite application. Requires Node.js 24 or newer.

The interface follows the user-supplied ZIP reference. See `DESIGN.md` for the existing color palette and glass effects to preserve when adding features.

```powershell
cd D:\watch\watch-boutique\frontend
npm.cmd install
npm.cmd run dev
```

Open http://localhost:5173. Start the sibling backend in a separate terminal; see `../backend/README.md`. Requests to `/api` are proxied to http://127.0.0.1:3000 by `vite.config.ts`. The frontend contains no Express dependencies or database code.

Run `npm.cmd run build` for a type-checked production build in this folder's `dist` directory. Run `npm.cmd run preview` to preview that build locally with the same API proxy (stop the dev server first).

On another computer install dependencies with `npm.cmd ci` using this folder's own lockfile. On Linux/macOS use `npm` instead of `npm.cmd`.
