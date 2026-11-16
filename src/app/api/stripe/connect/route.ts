import { fail, ok, readJson, serverError } from "@/lib/api-response";
import { CURRENCY, PLATFORM_FEE_PERCENT } from "@/lib/config";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { stripe } from "@/lib/stripe";
import type { Seller } from "@/lib/types";
import { isValidEmail } from "@/lib/utils";

// POST /api/stripe/connect { email }
export async function POST(request: Request) {
  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL;
  if (!SITE_URL) {
    return fail("NEXT_PUBLIC_SITE_URL is not set", 500);
  }
  try {
    const body = await readJson(request);
    if (body === undefined || typeof body !== "object" || body === null) {
      return fail("Request body must be a JSON object", 400);
    }

    const { email } = body as { email?: string };

    if (!email || typeof email !== "string") {
      return fail("Email is required", 400, { email: "Email is required" });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!isValidEmail(normalizedEmail)) {
      return fail("Invalid email address", 400, { email: "Invalid email address" });
    }

    // Check if seller already exists
    const { data: existingSeller } = await supabaseAdmin
      .from("sellers")
      .select("*")
      .eq("email", normalizedEmail)
      .maybeSingle();

    let accountId: string;
    let isNewAccount = false;

    if (existingSeller) {
      accountId = existingSeller.stripe_account_id;
    } else {
      // Create new Stripe Connect account (Express - Accounts v2)
      try {
        const account = await stripe.accounts.create({
          country: "US",
          controller: {
            losses: {
              payments: "stripe",
            },
          },
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
          metadata: {
            email: normalizedEmail,
          },
        });
        accountId = account.id;
        isNewAccount = true;
      } catch (stripeError) {
        console.error("Stripe account creation error:", stripeError);
        if (stripeError instanceof Error) {
          if (stripeError.message.includes("Connect is not enabled")) {
            return fail("Connect is not enabled for this Stripe account", 400);
          }
          return fail(stripeError.message, 400);
        }
        return fail("Failed to create Stripe account", 500);
      }

      // Save to database
      const { error: insertError } = await supabaseAdmin.from("sellers").insert({
        email: normalizedEmail,
        stripe_account_id: accountId,
        charges_enabled: false,
        details_submitted: false,
      });

      if (insertError) {
        console.error("Failed to save seller:", insertError);
        return fail("Failed to save seller account", 500);
      }
    }

    // Create account link for onboarding
    let accountLink;
    try {
      accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${SITE_URL}/sell/connect`,
        return_url: `${SITE_URL}/sell/connect/return?account_id=${accountId}`,
        type: "account_onboarding",
      });
    } catch (linkError) {
      if (linkError instanceof Error) {
        return fail(linkError.message, 400);
      }
      return fail("Failed to create account link", 500);
    }

    if (!accountLink || !accountLink.url) {
      return fail("Account link missing URL", 500);
    }

    return ok({ url: accountLink.url }, 200);
  } catch (error) {
    console.error("POST /api/stripe/connect error:", error);
    return serverError("POST /api/stripe/connect", error);
  }
}
