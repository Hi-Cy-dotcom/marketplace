# Development guide

## Project structure

```
src/
├── app/
│   ├── (browse)/                  # Route group: pages with the category sidebar
│   │   ├── layout.tsx             # Sidebar + mobile category chips
│   │   ├── page.tsx               # /
│   │   └── category/
│   │       ├── [slug]/page.tsx    # /category/:slug (pre-rendered for every category)
│   │       └── electronics/page.tsx  # Example static category page
│   ├── create/page.tsx            # /create (listing type picker)
│   ├── create/item/page.tsx       # /create/item (listing form)
│   ├── item/[id]/page.tsx         # /item/:id
│   ├── api/
│   │   ├── listings/route.ts      # GET, POST /api/listings
│   │   ├── listings/[id]/route.ts # GET /api/listings/:id
│   │   ├── messages/route.ts      # GET, POST /api/messages
│   │   └── upload/route.ts        # POST /api/upload
│   ├── layout.tsx                 # Root layout: Geist font, header
│   ├── not-found.tsx
│   └── globals.css                # Tailwind v3 directives + shadcn CSS variables
├── components/
│   ├── ui/                        # shadcn/ui primitives (generated, lightly edited)
│   ├── layout/                    # Header, logo, search bar, sidebar, category chips
│   └── marketplace/               # Feature components (grid, cards, forms, detail)
└── lib/
    ├── supabase.ts                # Build-safe Supabase client
    ├── api-client.ts              # Typed browser fetch wrappers for the API routes
    ├── api-response.ts            # Server helpers: ok(), fail(), readJson(), serverError()
    ├── validation.ts              # Validation rules shared by forms and API routes
    ├── categories.ts              # Category slugs, names, icons
    ├── image.ts                   # Client-side photo downscaling before upload
    ├── types.ts                   # Listing, Message, API response types
    └── utils.ts                   # cn(), price formatting, email check, timeAgo()
supabase-schema.sql                # Tables, indexes, triggers, RLS, storage bucket
```

## How data flows

1. Pages are thin server components. Data is fetched on the client by components in `components/marketplace/`, which call `lib/api-client.ts`.
2. `api-client.ts` calls the route handlers in `app/api/` and throws an `ApiClientError` (with `status` and field `details`) on failure.
3. Route handlers validate input with `lib/validation.ts`, talk to Supabase through `lib/supabase.ts`, and respond with `ok()` / `fail()` from `lib/api-response.ts`.
4. The database enforces the same constraints again (`CHECK` constraints, RLS, triggers).

The browser never talks to Supabase directly; all reads and writes go through the API routes.

## Conventions

### Next.js 16

This project runs Next.js 16. Its docs ship with the package in `node_modules/next/dist/docs/`; check them before using an unfamiliar API, since some behavior differs from older versions.

- **Dynamic `params` are a Promise** in pages and route handlers:

  ```ts
  export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> },
  ) {
    const { id } = await params;
  }
  ```

- `cacheComponents` is not enabled in `next.config.ts`, so the classic App Router rendering model applies (no `"use cache"` directives needed). Route handlers that read the request are dynamic automatically.
- Components that call `useSearchParams()` are wrapped in `<Suspense>` so the pages can still be pre-rendered.

### Tailwind CSS v3

The project is pinned to **Tailwind 3.4** (`tailwind.config.ts` + `postcss.config.mjs`). Don't install Tailwind v4 or `@tailwindcss/postcss`.

- Brand colors: `bg-facebook` (`#1877F2`), `hover:bg-facebook-hover`, `bg-facebook-light`.
- shadcn theme tokens (`bg-primary`, `text-muted-foreground`, …) are CSS variables in `globals.css`; `--primary` is Facebook Blue.
- Spacing follows Tailwind's default 4px scale.

### shadcn/ui

Components were generated with `shadcn@2.3.0`, the last CLI release that targets Tailwind v3. To add another one:

```bash
npx shadcn@2.3.0 add dialog
```

If npm complains about React 19 peer dependencies, choose **Use --legacy-peer-deps**.

### Supabase client

`src/lib/supabase.ts` falls back to placeholder values when `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` are missing, so `npm run build` never crashes. Route handlers call `requireSupabase()` first, which returns a clear `500` when the real values aren't set.

### Validation

Add or change rules in `src/lib/validation.ts` only; both the forms and the API use them. Keep the `CHECK` constraints in `supabase-schema.sql` in sync with `LIMITS`.

### Error handling

Every route handler wraps its body in `try/catch`. Unexpected errors go through `serverError(context, error)`, which logs the details and returns a generic `500` so internals don't leak to clients.

## Common tasks

### Add a category

Add an entry (slug, name, lucide icon) to `CATEGORIES` in `src/lib/categories.ts`. The sidebar, chips, form select, API validation, and `/category/[slug]` static params all pick it up automatically.

### Add a field to listings

1. Add the column in `supabase-schema.sql` (`alter table public.listings add column ...`) and run it.
2. Update `Listing` / `CreateListingInput` in `src/lib/types.ts`.
3. Add validation in `validateListingInput` in `src/lib/validation.ts`.
4. Add the input to `create-listing-form.tsx` and display it in `listing-preview.tsx` / `item-detail.tsx`.

## Local Supabase (optional)

Instead of a cloud project you can run Supabase locally with Docker and the [Supabase CLI](https://supabase.com/docs/guides/local-development):

```bash
npx supabase init          # once; creates supabase/ (not committed in this repo)
npx supabase start         # prints the API URL and anon key
npx supabase status -o env # show them again
```

Apply the schema:

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f supabase-schema.sql
```

Then put the local values in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<ANON_KEY from supabase status>
```

Images from a local (`http://`) Supabase are served without Next.js image optimization; that's expected.

## Testing

Before pushing, run:

```bash
npm run lint
npm run typecheck
npm run build
```

### API smoke test

With the dev server running and Supabase configured:

```bash
B=http://localhost:3000/api

# Upload an image
curl -F "file=@photo.jpg;type=image/jpeg" $B/upload

# Create a listing (use the URL returned above)
curl -H 'content-type: application/json' -d '{
  "title": "Test lamp", "description": "Works great", "price": "25",
  "category": "home-goods", "location": "Austin, TX",
  "seller_email": "seller@example.com", "image_url": null
}' $B/listings

# Search and filter
curl "$B/listings?search=lamp"
curl "$B/listings?category=home-goods"

# Message the seller, then read it back as the seller
curl -H 'content-type: application/json' \
  -d '{"listing_id":"<id>","buyer_email":"buyer@example.com","message":"Still available?"}' $B/messages
curl "$B/messages?listing_id=<id>&email=seller@example.com"
```

Expected failures: a `.txt` renamed to `.png` → `400` from `/upload`; an unknown category → `400`; a random UUID on `/listings/<id>` → `404`.

### Manual UI checklist

- [ ] Create a listing with a photo; the live preview updates while typing
- [ ] Submitting an empty form shows inline errors; a file over 5MB is rejected
- [ ] The new listing shows on `/` and in its category
- [ ] Header search finds it; a nonsense search shows the empty state
- [ ] The detail page shows the photo, price, details, and seller
- [ ] Sending a message shows the confirmation
- [ ] `/item/00000000-0000-0000-0000-000000000000` shows "This listing isn't available"
- [ ] Layout works at phone (~390px), tablet (~768px), and desktop widths

## Troubleshooting

| Problem | Cause / fix |
| --- | --- |
| `lightningcss` / `@tailwindcss/*` errors | Tailwind v4 got installed. Run `npm ls tailwindcss` and reinstall `tailwindcss@3.4.17`. |
| Env var changes ignored | Restart `npm run dev`; on Vercel, redeploy. `NEXT_PUBLIC_*` values are inlined at build time. |
| `Invalid src prop ... hostname is not configured` | Add the image host to `images.remotePatterns` in `next.config.ts`. |
| Messages GET returns `[]` | Pass the seller's or buyer's email as `?email=`; RLS hides other messages. |
| `AGENTS.md` keeps reappearing in `git status` | `next dev` regenerates its agent-rules block; commit it. |
