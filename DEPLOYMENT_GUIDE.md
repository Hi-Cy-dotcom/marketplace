# Stripe Connect Deployment Guide

This guide covers deploying the marketplace with Stripe Connect payments to Vercel.

## Prerequisites

1. **Stripe Account** with Connect enabled (Express type)
2. **Supabase Project** with the schema updated
3. **Vercel Account** for deployment
4. **Git repository** (GitHub, GitLab, or Bitbucket)

## Step 1: Update Database Schema

Run the SQL from `supabase-schema.sql` in your Supabase SQL Editor. This adds:
- `sellers` table (Stripe Connect account info)
- `orders` table (payment records)
- `status` and `sold_at` columns to `listings` table

**Verification Checklist:**
- [ ] `sellers` table exists with email (primary key), stripe_account_id, charges_enabled, details_submitted, created_at
- [ ] `orders` table exists with all required columns
- [ ] `listings` table has status column with CHECK constraint ('available','sold')
- [ ] `listings` table has sold_at column
- [ ] Existing listings have status='available'
- [ ] RLS is enabled on sellers and orders with NO public policies
- [ ] Indexes exist on orders.listing_id and orders.stripe_session_id

## Step 2: Install Dependencies

```bash
npm install stripe
```

## Step 3: Configure Environment Variables

Add these to your `.env.local` file:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_... (added after webhook creation)

# Site
NEXT_PUBLIC_SITE_URL=https://your-production-url.com

# Email (Resend)
RESEND_API_KEY=re_...
```

**Important Notes:**
- `SUPABASE_SERVICE_ROLE_KEY` is server-only - never expose to client
- `STRIPE_SECRET_KEY` is server-only - never expose to client
- `STRIPE_WEBHOOK_SECRET` will be added after creating the webhook
- `NEXT_PUBLIC_SITE_URL` must be your production URL, not localhost

## Step 4: Deploy to Vercel

1. Push your code to Git
2. Import the project in Vercel
3. Add all environment variables from Step 3 (except STRIPE_WEBHOOK_SECRET for now)
4. Deploy

## Step 5: Create Stripe Webhook

After deployment, run the webhook creation script:

```bash
WEBHOOK_URL=https://your-production-url.com/api/stripe/webhook node --env-file=.env.local scripts/create-webhook.mjs
```

This will output a signing secret like:
```
STRIPE_WEBHOOK_SECRET=whsec_...
```

Add this to your Vercel environment variables and redeploy.

**Important:** Only delete webhooks that YOU created. The Stripe sandbox is shared with other candidates.

## Step 6: Redeploy

After adding `STRIPE_WEBHOOK_SECRET`, redeploy your Vercel project.

## Step 7: Remove allowedDevOrigins (if present)

If you added `allowedDevOrigins` to `next.config.ts` for local testing, remove it before production deployment:

```typescript
const nextConfig: NextConfig = {
  // Remove allowedDevOrigins for production
  images: {
    // ... existing config
  },
};
```

## Local Testing with Stripe CLI

For local development, use the Stripe CLI to forward webhooks:

```bash
stripe listen --api-key $STRIPE_SECRET_KEY --forward-connect-to localhost:3000/api/stripe/webhook
```

Use the temporary `whsec_...` key it prints as `STRIPE_WEBHOOK_SECRET` while testing.

## Manual Test Script

Follow these steps to test the full flow on the live site:

### 1. Seller Onboarding Test
- [ ] Navigate to `/sell/connect`
- [ ] Enter seller email (use a test email)
- [ ] Complete Stripe onboarding with test data
- [ ] Verify you see "You're connected!" message
- [ ] Check Supabase `sellers` table - verify account is saved with charges_enabled=true

### 2. Create Listing Test
- [ ] Create a new listing with the seller email used in step 1
- [ ] Set price to at least $1.00 (above Stripe minimum)
- [ ] Upload an image
- [ ] Publish the listing

### 3. Buy Now Button Test
- [ ] Navigate to the listing detail page
- [ ] Verify "Buy Now" button is visible
- [ ] Click "Buy Now"
- [ ] Verify Stripe Checkout opens with correct price
- [ ] Use test card: 4242 4242 4242 4242
- [ ] Complete payment
- [ ] Verify redirect to `/checkout/success`
- [ ] Verify success page shows order details

### 4. Webhook Test
- [ ] Check Supabase `orders` table - verify order status is 'paid'
- [ ] Check Supabase `listings` table - verify status is 'sold' and sold_at is set
- [ ] Navigate back to listing - verify "Sold" badge is visible
- [ ] Navigate to marketplace - verify listing shows "Sold" badge and grayscale image

### 5. Sold Item Test
- [ ] Try to buy the sold item again - verify button is disabled
- [ ] Try to message seller - verify "This item has been sold" message

### 6. Non-Onboarded Seller Test
- [ ] Create a listing with a different email (not onboarded)
- [ ] Navigate to listing detail page
- [ ] Verify "Seller hasn't enabled payments yet" message
- [ ] Verify link to `/sell/connect` is shown

### 7. Price Too Low Test
- [ ] Create a listing with price $0.10
- [ ] Navigate to listing detail page
- [ ] Verify "Price is too low for Stripe processing" message

## Troubleshooting

**Webhook not firing:**
- Verify STRIPE_WEBHOOK_SECRET is set in Vercel
- Check Vercel logs for webhook errors
- Verify webhook URL is correct (production, not preview)

**Stripe Connect not enabled:**
- Verify your Stripe account has Connect enabled
- Check Stripe dashboard for Connect settings

**Payment fails:**
- Verify seller has charges_enabled=true in Supabase
- Check Stripe dashboard for payment errors
- Verify listing status is 'available'

**Listing not marked as sold:**
- Check webhook is receiving events
- Verify webhook signature is correct
- Check Supabase logs for errors

## Security Notes

- Never commit `.env.local` or any secrets to Git
- Service role key bypasses RLS - only use in server routes
- Stripe secret key bypasses RLS - only use in server routes
- Webhook signature verification prevents spoofing
- Orders table has no public access - buyer emails are private
