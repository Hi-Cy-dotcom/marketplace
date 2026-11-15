# Setup

This guide takes you from a fresh clone to a running app, locally and on Vercel.

## Prerequisites

- Node.js 20.9 or newer (Next.js 16 requirement)
- A free [Supabase](https://supabase.com) account
- A [Vercel](https://vercel.com) account (for deployment)

## 1. Install dependencies

```bash
npm install
```

## 2. Create a Supabase project

1. Go to the [Supabase dashboard](https://supabase.com/dashboard) and click **New project**.
2. Pick a name, a database password, and a region close to your users.
3. Wait for the project to finish provisioning (about a minute).

## 3. Run the database schema

1. In your project, open **SQL Editor → New query**.
2. Paste the full contents of [`supabase-schema.sql`](./supabase-schema.sql) and click **Run**.

This creates:

- the `listings` and `messages` tables (with a cascading foreign key from messages to listings)
- indexes on `listings.category`, `listings.created_at`, and `messages.listing_id`
- triggers that keep `updated_at` current and copy the seller's email onto each message
- Row Level Security policies on both tables
- the public `listing-images` storage bucket (5MB limit, JPEG/PNG/WebP only) and its storage policies

The script is idempotent: you can run it again after editing it.

### Verify the storage bucket

The SQL creates the bucket for you. To double-check, open **Storage** in the dashboard. You should see a bucket called `listing-images` marked **Public**.

If you prefer to create it by hand (for example if your SQL role can't write to `storage.buckets`):

1. **Storage → New bucket**
2. Name: `listing-images`
3. Turn on **Public bucket**
4. Optional: set the file size limit to `5 MB` and allowed MIME types to `image/jpeg, image/png, image/webp`
5. Re-run the storage-policy section at the bottom of `supabase-schema.sql`

## 4. Add environment variables

Find your keys under **Project Settings → API** (or **Connect → App frameworks**).

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-or-publishable-key
```

Use the **anon** (legacy) or **publishable** key. Never use the `service_role` / secret key here: `NEXT_PUBLIC_` variables are exposed to the browser.

`.env.local` is git-ignored. Don't commit real keys.

## 5. Run the app

```bash
npm run dev
```

Open http://localhost:3000 and try the full flow:

1. Click **Create listing → Item for sale**, add a photo and the details, then **Publish**.
2. Your listing appears on the homepage and in its category.
3. Search for it in the header search bar.
4. Open it and send the seller a message.

To confirm the message was stored, open **Table Editor → messages** in Supabase, or call:

```bash
curl "http://localhost:3000/api/messages?listing_id=<listing-id>&email=<seller-email>"
```

## 6. Deploy to Vercel

### Using the dashboard

1. Push the repository to GitHub, GitLab, or Bitbucket.
2. In Vercel, click **Add New → Project** and import the repository. Vercel detects Next.js automatically; keep the default build settings (`npm run build`).
3. Under **Environment Variables**, add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` for Production, Preview, and Development.
4. Click **Deploy**.

### Using the CLI

```bash
npm i -g vercel
vercel                                       # link and create a preview deployment
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel --prod
```

### Notes

- `NEXT_PUBLIC_*` values are inlined at build time. If you change them, **redeploy** so the new values take effect.
- The build succeeds even without env vars (the Supabase client falls back to placeholder values), but the API returns a "Supabase is not configured" error until they are set.
- Vercel limits serverless request bodies to about 4.5MB. The upload form downsizes large photos in the browser before upload, so typical phone photos work. Uploads made directly to the API must stay under that limit.
- Next.js image optimization is enabled for `*.supabase.co`. If you use a custom Supabase domain, it is added automatically from `NEXT_PUBLIC_SUPABASE_URL` at build time.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| "Supabase is not configured" | Set both env vars in `.env.local` (or Vercel) and restart / redeploy. |
| `relation "public.listings" does not exist` | Run `supabase-schema.sql` in the SQL editor. |
| Upload fails with "Bucket not found" | Create the `listing-images` bucket (step 3). |
| Upload fails with a policy / RLS error | Re-run the storage-policy section of the schema. |
| Images don't display | Make sure the bucket is **Public**. |
