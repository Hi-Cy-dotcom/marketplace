# marketplace-demo

A Facebook Marketplace clone built with Next.js (App Router), React 19, TypeScript, Tailwind CSS v3, shadcn/ui, and Supabase (Postgres + Storage).

You can create a listing with a photo, browse and search listings, filter by category, open a listing, and message the seller. There is no authentication in this version: buyers and sellers are identified by the email address they enter.

## Quick start

```bash
npm install
cp .env.example .env.local   # then fill in your Supabase URL and anon key
npm run dev                  # http://localhost:3000
```

Before the app can load or save data you need a Supabase project with the schema applied. [SETUP.md](./SETUP.md) walks through it in about 5 minutes.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server on port 3000 |
| `npm run build` | Production build (works without env vars) |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript strict check (`tsc --noEmit`) |

## Tech stack

- **Next.js 16** (App Router, `src/` directory, `@/*` import alias)
- **React 19** + **TypeScript** (strict)
- **Tailwind CSS 3.4** with `tailwindcss-animate`, PostCSS, Autoprefixer
- **shadcn/ui**: button, card, input, textarea, badge, avatar, select, separator
- **lucide-react** icons, **Geist** font
- **Supabase**: `@supabase/supabase-js` for Postgres and the `listing-images` storage bucket

## Pages

| Route | Description |
| --- | --- |
| `/` | Homepage: category sidebar, search, listing grid |
| `/category/[slug]` | Listings in a category (e.g. `/category/vehicles`) |
| `/category/electronics` | Example static category page |
| `/create` | Choose a listing type |
| `/create/item` | Create-listing form with photo upload and live preview |
| `/item/[id]` | Listing detail and "Message seller" form |

## API

| Method | Route | Notes |
| --- | --- | --- |
| `GET` | `/api/listings` | `?search=`, `?category=`, `?limit=` (1–100, default 60) |
| `POST` | `/api/listings` | Create a listing (JSON) → `201` |
| `GET` | `/api/listings/[id]` | One listing, `404` if missing |
| `GET` | `/api/messages` | `?listing_id=` **and** `?email=` (seller or buyer) |
| `POST` | `/api/messages` | Send a message (JSON) → `201` |
| `POST` | `/api/upload` | `multipart/form-data` with `file` (JPEG/PNG/WebP, ≤ 5MB) → public URL |

Responses are `{ "data": ... }` on success and `{ "error": "...", "details"?: { field: "message" } }` on failure. See [FEATURES.md](./FEATURES.md) for details.

## Documentation

- [SETUP.md](./SETUP.md): Supabase setup, environment variables, deploying to Vercel
- [FEATURES.md](./FEATURES.md): features, API reference, database and security model
- [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md): project structure, conventions, local Supabase, testing, troubleshooting
