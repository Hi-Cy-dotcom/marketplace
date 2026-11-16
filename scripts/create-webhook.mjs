/**
 * Create a Stripe webhook endpoint for Connect events.
 * 
 * IMPORTANT: Only delete webhooks that YOU created. The Stripe sandbox is shared
 * with other candidates, so deleting others' webhooks will break their apps.
 * 
 * Usage:
 *   WEBHOOK_URL=https://your-production-url.com/api/stripe/webhook node --env-file=.env.local scripts/create-webhook.mjs
 * 
 * For local testing with Stripe CLI:
 *   stripe listen --api-key $STRIPE_SECRET_KEY --forward-connect-to localhost:3000/api/stripe/webhook
 *   Use the temporary whsec_... key it prints as STRIPE_WEBHOOK_SECRET
 */

import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const webhookUrl = process.env.WEBHOOK_URL;

if (!stripeSecretKey) {
  console.error("STRIPE_SECRET_KEY is not set");
  process.exit(1);
}

if (!webhookUrl) {
  console.error("WEBHOOK_URL is not set");
  console.error("Usage: WEBHOOK_URL=https://your-production-url.com/api/stripe/webhook node --env-file=.env.local scripts/create-webhook.mjs");
  process.exit(1);
}

const stripe = new Stripe(stripeSecretKey);

async function createWebhook() {
  try {
    console.log(`Creating webhook for: ${webhookUrl}`);
    
    const webhook = await stripe.webhookEndpoints.create({
      url: webhookUrl,
      connect: true,
      enabled_events: ["checkout.session.completed", "account.updated"],
    });

    console.log("\n✅ Webhook created successfully!");
    console.log(`Webhook ID: ${webhook.id}`);
    console.log(`Webhook URL: ${webhook.url}`);
    console.log(`\n🔑 IMPORTANT: Add this signing secret to your environment variables:`);
    console.log(`STRIPE_WEBHOOK_SECRET=${webhook.secret}`);
    console.log(`\nAdd this to your Vercel project environment variables and redeploy.`);
  } catch (error) {
    console.error("Failed to create webhook:", error.message);
    process.exit(1);
  }
}

createWebhook();
