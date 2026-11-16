/**
 * Create a Stripe webhook endpoint for Connect events.
 * 
 * IMPORTANT: Only delete webhooks that YOU created. The Stripe sandbox is shared
 * with other candidates, so deleting others' webhooks will break their apps.
 * 
 * Usage:
 *   node --env-file=.env scripts/create-webhook.mjs [WEBHOOK_URL]
 * 
 * Or with environment variable:
 *   WEBHOOK_URL=https://your-production-url.com/api/stripe/webhook node --env-file=.env scripts/create-webhook.mjs
 * 
 * Default URL: https://marketplace-umber-seven.vercel.app/api/stripe/webhook
 */

import Stripe from "stripe";

// Get Stripe secret key from environment
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  console.error("Error: STRIPE_SECRET_KEY is not set in environment");
  console.error("Usage: node --env-file=.env scripts/create-webhook.mjs");
  process.exit(1);
}

// Get webhook URL from CLI argument or environment variable, with default
const webhookUrl = process.argv[2] || process.env.WEBHOOK_URL || "https://marketplace-umber-seven.vercel.app/api/stripe/webhook";

// Validate URL
function validateUrl(url) {
  if (!url.startsWith("https://")) {
    console.error("Error: URL must start with https://");
    return false;
  }
  if (!url.endsWith("/api/stripe/webhook")) {
    console.error("Error: URL must end with /api/stripe/webhook");
    return false;
  }
  if (url.includes("localhost")) {
    console.error("Error: URL must not contain localhost");
    return false;
  }
  if (url.includes(".vercel.app") && !url.includes("marketplace-umber-seven")) {
    console.error("Error: Vercel preview URLs are not supported. Use the production URL.");
    return false;
  }
  return true;
}

if (!validateUrl(webhookUrl)) {
  process.exit(1);
}

const stripe = new Stripe(stripeSecretKey);

async function createWebhook() {
  try {
    console.log(`Checking for existing webhook at: ${webhookUrl}`);
    
    // List existing webhooks to check for duplicates
    const existingWebhooks = await stripe.webhookEndpoints.list({ limit: 100 });
    const existing = existingWebhooks.data.find(w => w.url === webhookUrl);
    
    if (existing) {
      console.log(`\n⚠️  A webhook with this URL already exists:`);
      console.log(`   ID: ${existing.id}`);
      console.log(`   Status: ${existing.status}`);
      console.log(`   URL: ${existing.url}`);
      
      const forceFlag = process.argv.includes("--force");
      if (!forceFlag) {
        console.log(`\nTo recreate this webhook, run with --force flag:`);
        console.log(`   node --env-file=.env scripts/create-webhook.mjs ${webhookUrl} --force`);
        process.exit(1);
      } else {
        console.log(`\n--force flag detected. Proceeding to create new webhook...`);
      }
    }
    
    console.log(`Creating webhook for: ${webhookUrl}`);
    
    const webhook = await stripe.webhookEndpoints.create({
      url: webhookUrl,
      connect: true,
      enabled_events: ["checkout.session.completed", "account.updated"],
    });

    console.log("\n✅ Webhook created successfully!");
    console.log(`Webhook ID: ${webhook.id}`);
    console.log(`Webhook URL: ${webhook.url}`);
    console.log(`\n🔑 Copy this signing secret now - Stripe will not show it again:`);
    console.log(`STRIPE_WEBHOOK_SECRET=${webhook.secret}`);
    console.log(`\nAdd this to Vercel as STRIPE_WEBHOOK_SECRET (Secret, Production), then redeploy.`);
  } catch (error) {
    console.error("Failed to create webhook:");
    if (error.message) {
      console.error(error.message);
    } else {
      console.error(String(error));
    }
    process.exit(1);
  }
}

createWebhook();
