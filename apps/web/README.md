# DoBook Frontend (Next.js)

This frontend runs on Next.js (App Router) and React.

## Available Scripts

In the project directory, you can run:

### `npm run dev`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm run lint`

Runs Next.js linting.

### `npm run build`

Builds the app for production.\
It correctly bundles React in production mode and optimizes the build for the best performance.

Your app is ready to be deployed!

### `npm run start`

Runs the production server (requires `npm run build` first).

## Environment

No separate backend is required. The app uses same-origin `/api/*` routes and persists to `apps/web/localdb.json`.

Note for Vercel: the filesystem is ephemeral, so `localdb.json` won’t persist reliably in production. Use an external store (DB/KV) for real deployments.

## Routes

- `/` landing page + auth dialog
- `/dashboard` business dashboard (client-side auth gate)
- `/book/[businessId]` public booking widget
