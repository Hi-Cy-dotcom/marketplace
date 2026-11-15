-- =============================================================================
-- marketplace-demo: Supabase schema
--
-- Run this whole file once in the Supabase dashboard (SQL Editor -> New query).
-- It is idempotent, so it is safe to re-run after changes.
--
-- There is NO authentication in this version: users are identified by the
-- email address they type in. The Row Level Security (RLS) policies below are
-- written with that in mind and should be tightened once Supabase Auth is added.
-- =============================================================================

-- gen_random_uuid() is built into Postgres 13+, pgcrypto is kept for older setups.
create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Helper: email of the current caller.
-- The API routes send an `x-user-email` header (see src/lib/supabase.ts).
-- PostgREST exposes request headers via the `request.headers` setting.
-- Returns NULL when the header is missing.
-- -----------------------------------------------------------------------------
create or replace function public.request_user_email()
returns text
language sql
stable
as $$
  select nullif(
    lower(trim(
      coalesce(current_setting('request.headers', true), '{}')::json ->> 'x-user-email'
    )),
    ''
  );
$$;

-- -----------------------------------------------------------------------------
-- listings
-- -----------------------------------------------------------------------------
create table if not exists public.listings (
  id           uuid primary key default gen_random_uuid(),
  title        text not null check (char_length(title) between 3 and 100),
  description  text not null default '' check (char_length(description) <= 2000),
  price        numeric(12, 2) not null check (price >= 0),
  category     text not null check (char_length(category) between 1 and 50),
  location     text not null check (char_length(location) between 2 and 100),
  seller_email text not null check (
    char_length(seller_email) <= 254
    and seller_email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]{2,}$'
  ),
  image_url    text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists listings_category_idx on public.listings (category);
create index if not exists listings_created_at_idx on public.listings (created_at desc);

-- Keep updated_at current on every UPDATE.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists listings_set_updated_at on public.listings;
create trigger listings_set_updated_at
  before update on public.listings
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- messages
-- -----------------------------------------------------------------------------
create table if not exists public.messages (
  id           uuid primary key default gen_random_uuid(),
  listing_id   uuid not null references public.listings (id) on delete cascade,
  buyer_email  text not null check (
    char_length(buyer_email) <= 254
    and buyer_email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]{2,}$'
  ),
  seller_email text not null,
  message      text not null check (char_length(message) between 1 and 2000),
  created_at   timestamptz not null default now()
);

create index if not exists messages_listing_id_idx on public.messages (listing_id);

-- Always copy seller_email from the listing so clients cannot spoof the
-- recipient of a message. SECURITY DEFINER lets it read listings regardless of
-- the caller's privileges; search_path is pinned for safety.
create or replace function public.set_message_seller_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  listing_seller text;
begin
  select l.seller_email into listing_seller
  from public.listings l
  where l.id = new.listing_id;

  if listing_seller is null then
    raise exception 'Listing % does not exist', new.listing_id
      using errcode = '23503'; -- foreign_key_violation
  end if;

  new.seller_email = listing_seller;
  new.buyer_email = lower(trim(new.buyer_email));
  return new;
end;
$$;

drop trigger if exists messages_set_seller_email on public.messages;
create trigger messages_set_seller_email
  before insert on public.messages
  for each row execute function public.set_message_seller_email();

-- -----------------------------------------------------------------------------
-- Row Level Security
-- With RLS enabled, every operation is denied unless a policy allows it.
-- No UPDATE or DELETE policies exist, so nobody can edit or remove rows
-- through the public API until auth is added.
-- -----------------------------------------------------------------------------
alter table public.listings enable row level security;
alter table public.messages enable row level security;

-- listings: anyone (anonymous or signed in) can browse listings.
drop policy if exists "Listings are publicly readable" on public.listings;
create policy "Listings are publicly readable"
  on public.listings
  for select
  to anon, authenticated
  using (true);

-- listings: anyone can create a listing (no auth yet). Table CHECK
-- constraints enforce valid data; the API also validates input.
drop policy if exists "Anyone can create listings" on public.listings;
create policy "Anyone can create listings"
  on public.listings
  for insert
  to anon, authenticated
  with check (true);

-- messages: anyone can send a message about an existing listing. The trigger
-- above fills in seller_email from the listing.
drop policy if exists "Anyone can send messages" on public.messages;
create policy "Anyone can send messages"
  on public.messages
  for insert
  to anon, authenticated
  with check (
    exists (select 1 from public.listings l where l.id = listing_id)
  );

-- messages: messages contain private email addresses, so they are NOT public.
-- A message is only visible to a caller who identifies (via the x-user-email
-- header) as its seller or its buyer. Requests without the header see nothing.
-- NOTE: without auth this is a soft restriction (an email can be claimed by
-- anyone). Replace with `auth.jwt() ->> 'email'` once Supabase Auth is added.
drop policy if exists "Messages are visible to their seller or buyer" on public.messages;
create policy "Messages are visible to their seller or buyer"
  on public.messages
  for select
  to anon, authenticated
  using (
    public.request_user_email() is not null
    and public.request_user_email() in (seller_email, buyer_email)
  );

-- -----------------------------------------------------------------------------
-- Storage: `listing-images` bucket (public read)
-- You can also create it in the dashboard: Storage -> New bucket ->
-- name "listing-images", toggle "Public bucket" on.
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'listing-images',
  'listing-images',
  true,                                        -- public URLs, no signed URL needed
  5242880,                                     -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- storage: anyone can read objects in the bucket (images are shown publicly).
drop policy if exists "Listing images are publicly readable" on storage.objects;
create policy "Listing images are publicly readable"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'listing-images');

-- storage: anyone can upload new images to the bucket (no auth yet). There is
-- no UPDATE/DELETE policy, so existing images cannot be overwritten or removed.
-- Type and size limits are enforced by the bucket settings above and by
-- POST /api/upload.
drop policy if exists "Anyone can upload listing images" on storage.objects;
create policy "Anyone can upload listing images"
  on storage.objects
  for insert
  to anon, authenticated
  with check (bucket_id = 'listing-images');
