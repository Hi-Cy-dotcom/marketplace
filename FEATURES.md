# Features

## Browse and search

- **Homepage (`/`)**: "Today's picks" grid of the newest listings (up to 60).
- **Responsive grid**: 1 column on phones, then 2 / 3 / 4 / 5 columns as the screen widens. Cards show the photo, price, title, and location, and lift slightly on hover.
- **Search**: the header search bar filters by keyword in the title and description (case-insensitive). The query lives in the URL (`?search=bike`), so results are shareable and survive a refresh.
- **Categories**: 15 Marketplace-style categories. Desktop shows a sidebar; mobile shows scrollable chips under the header. Each category has its own page (`/category/[slug]`), and search works inside a category.
- **Static example**: `/category/electronics` is a hand-written static page that reuses the same browser component.
- **States**: skeleton cards while loading; an error panel with **Try again**; an empty state that suggests clearing the search or creating a listing.

## Create a listing (`/create` → `/create/item`)

- **Listing type picker** at `/create`. "Item for sale" is enabled; Vehicle and Home for rent are shown as "Coming soon".
- **Photo upload**: drag-and-drop or click to browse, with an instant preview and a remove button. JPEG, PNG, or WebP up to 5MB. Large photos (over 1.5MB) are downscaled to at most 2048px in the browser before upload.
- **Fields**: title, price, category, description, location, seller email.
- **Price formatting**: the price field adds thousands separators as you type (`1234567.5` → `1,234,567.5`). Displayed prices use USD; `0` shows as **Free**.
- **Live preview card** that updates as you type, matching how the listing will look in the grid.
- **Validation**: client-side checks for every field, with inline messages. The same rules (`src/lib/validation.ts`) run again on the server, and server-side field errors are shown on the form too.
- **Feedback**: the button shows **Uploading photo…** then **Publishing…**. On success you get a confirmation with links to the new listing and the homepage; on failure, an error alert and your input is kept.

## Item detail (`/item/[id]`)

- Large photo on a dark backdrop, title, price, time since listing, location, category badge, and full description.
- **Seller information**: avatar initials, name derived from the email, and a `mailto:` link.
- **Message seller** form: buyer email and message (prefilled with "Hi, is this still available?"). Shows **Sending…**, then a success confirmation with a **Send another message** option.
- **Back button**: returns to the previous page, or to the homepage when opened directly.
- **Missing listings**: invalid or unknown IDs show a "This listing isn't available" state; network/server errors show a retry option.

## Messaging

- Messages are stored in the `messages` table with the listing ID, buyer email, seller email, and text. Email delivery isn't implemented yet.
- `seller_email` always comes from the listing (set by the API and enforced by a database trigger), so a client can't route a message to someone else.
- You can't message yourself: if the buyer email matches the seller email, the API returns `400`.
- Messages are private. They can only be read through `GET /api/messages` by passing the seller's or buyer's email (see the security model below).

## API reference

All routes return JSON. Success: `{ "data": ... }`. Failure: `{ "error": "message", "details"?: { "field": "message" } }`.

### `GET /api/listings`

| Query param | Description |
| --- | --- |
| `search` | Keyword (max 100 chars), matched against title and description |
| `category` | Category slug (e.g. `electronics`); unknown slugs return `400` |
| `limit` | 1–100, default 60 |

Returns `200` with listings, newest first.

### `POST /api/listings`

```json
{
  "title": "Road bike",
  "description": "Great condition",
  "price": "1,250",
  "category": "sporting-goods",
  "location": "Portland, OR",
  "seller_email": "seller@example.com",
  "image_url": "https://<project>.supabase.co/storage/v1/object/public/listing-images/..."
}
```

`price` can be a number or a formatted string. `image_url` is optional (`null` allowed) but must be an `http(s)` URL if present. Returns `201` with the new listing, or `400` with field `details`.

### `GET /api/listings/[id]`

Returns `200` with the listing, or `404` if the ID is not a valid UUID or doesn't exist.

### `POST /api/messages`

```json
{ "listing_id": "<uuid>", "buyer_email": "buyer@example.com", "message": "Is this available?" }
```

Returns `201` with the stored message, `400` for invalid input or messaging yourself, `404` if the listing doesn't exist.

### `GET /api/messages?listing_id=<uuid>&email=<email>`

Returns `200` with the messages on that listing that `email` is a party to (as seller or buyer), newest first. Both parameters are required (`400` otherwise); `404` if the listing doesn't exist.

### `POST /api/upload`

`multipart/form-data` with a `file` field. Checks the declared MIME type, the 5MB limit, and the file's magic bytes (so a renamed text file is rejected). Stores the image as `listings/YYYY/MM/<uuid>.<ext>` in the `listing-images` bucket. Returns `201` with `{ "url": "...", "path": "..." }`.

### Status codes

| Code | When |
| --- | --- |
| `200` | Successful read |
| `201` | Created (listing, message, upload) |
| `400` | Invalid JSON, query params, or fields |
| `404` | Listing not found |
| `500` | Supabase not configured, or an unexpected error (details are logged server-side, not returned) |

## Database

Defined in [`supabase-schema.sql`](./supabase-schema.sql).

**`listings`**: `id` (uuid, `gen_random_uuid()`), `title`, `description`, `price` (numeric, ≥ 0), `category`, `location`, `seller_email`, `image_url`, `created_at`, `updated_at`. `CHECK` constraints mirror the API validation, and a trigger keeps `updated_at` current.

**`messages`**: `id` (uuid), `listing_id` (FK → `listings.id`, `ON DELETE CASCADE`), `buyer_email`, `seller_email`, `message`, `created_at`.

**Indexes**: `listings.category`, `listings.created_at desc`, `messages.listing_id`.

**Storage**: public bucket `listing-images`, 5MB limit, JPEG/PNG/WebP only.

## Security model (no auth yet)

Row Level Security is enabled on both tables. Each policy is commented in the SQL file.

| Table | Operation | Who |
| --- | --- | --- |
| `listings` | `SELECT` | Everyone |
| `listings` | `INSERT` | Everyone |
| `messages` | `INSERT` | Everyone, for an existing listing |
| `messages` | `SELECT` | Only a caller whose `x-user-email` request header matches the message's seller or buyer |
| `storage.objects` (`listing-images`) | `SELECT`, `INSERT` | Everyone |

There are no `UPDATE` or `DELETE` policies, so rows and images can't be modified or removed through the public API.

The API routes use the anon key. For message reads they create a Supabase client that sends the `x-user-email` header, and the RLS policy reads it with `current_setting('request.headers')`. A plain anon-key request without the header gets an empty list.

**Limitation:** without authentication, anyone can claim any email address, so message privacy is only a soft restriction. When Supabase Auth is added, replace `request_user_email()` with `auth.jwt() ->> 'email'` in the policy and require sign-in to create listings.
