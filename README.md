# DoBook

## Dev

This app is backendless: the Next.js app includes API routes and persists data to a local JSON file.

- Install: `npm run install:web`
- Start: `npm run dev`
- Open: `http://localhost:3000`

## Deploy (Vercel)

Deploy on Vercel by setting the Project **Root Directory** to `apps/web` (Framework: Next.js).

Important: writing to `apps/web/localdb.json` will **not** persist on Vercel (serverless/ephemeral filesystem). For production you’ll want to move storage to an external database/KV.

## Local Data

- Data is stored in `apps/web/localdb.json` (created automatically on first run).
