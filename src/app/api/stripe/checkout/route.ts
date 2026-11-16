import { fail, ok, readJson, serverError } from "@/lib/api-response";
import { CURRENCY, PLATFORM_FEE_PERCENT } from "@/lib/config";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { stripe } from "@/lib/stripe";
import type { Listing, Seller } from "@/lib/types";

if (!process.env.NEXT_PUBLIC_SITE_URL) {
  throw new Error("NEXT_PUBLIC_SITE_URL is not set");
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL;

// POST /api/stripe/checkout { listingId }
export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    if (body === undefined || typeof body !== "object" || body === null) {
      return fail("Request body must be a JSON object", 400);
    }

    const { listingId } = body as { listingId?: string };

    if (!listingId || typeof listingId !== "string") {
      return fail("Listing ID is required", 400, { listingId: "Listing ID is required" });
    }

    // Load listing and seller
    const { data: listing, error: listingError } = await supabaseAdmin
      .from("listings")
      .select("*")
      .eq("id", listingId)
      .maybeSingle();

    if (listingError || !listing) {
      return fail("Listing not found", 404);
    }

    if (listing.status === "sold") {
      return fail("This item has already been sold", 400);
    }

    // Load seller
    const { data: seller, error: sellerError } = await supabaseAdmin
      .from("sellers")
      .select("*")
      .eq("email", listing.seller_email)
      .maybeSingle();

    if (sellerError || !seller) {
      return fail("Seller not found", 404);
    }

    if (!seller.charges_enabled) {
      return fail("Seller hasn't enabled payments yet", 400);
    }

    // Calculate amount in smallest currency unit
    const amount = Math.round(listing.price * 100);
    const applicationFeeAmount = Math.round(amount * PLATFORM_FEE_PERCENT / 100);

    if (amount < 50) {
      // Stripe minimum is $0.50 USD
      return fail("Price is too low for Stripe processing", 400);
    }

    // Create pending order
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .insert({
        listing_id: listing.id,
        stripe_account_id: seller.stripe_account_id,
        stripe_session_id: "", // Will be set after session creation
        amount_total: amount,
        application_fee_amount: applicationFeeAmount,
        currency: CURRENCY,
        buyer_email: null, // Will be set after payment
        status: "pending",
      })
      .select()
      .single();

    if (orderError || !order) {
      console.error("Failed to create order:", orderError);
      return fail("Failed to create order", 500);
    }

    // Create Stripe Checkout Session on connected account
    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: CURRENCY,
              product_data: {
                name: listing.title,
                description: listing.description.substring(0, 500),
                images: listing.image_url ? [listing.image_url] : undefined,
              },
              unit_amount: amount,
            },
          },
        ],
        payment_intent_data: {
          application_fee_amount: applicationFeeAmount,
          metadata: {
            order_id: order.id,
            listing_id: listing.id,
          },
        },
        metadata: {
          order_id: order.id,
          listing_id: listing.id,
        },
        expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // 30 minutes
        success_url: `${SITE_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${SITE_URL}/item/${listing.id}`,
      },
      {
        stripeAccount: seller.stripe_account_id,
      }
    );

    // Update order with session ID
    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update({ stripe_session_id: session.id })
      .eq("id", order.id);

    if (updateError) {
      console.error("Failed to update order with session ID:", updateError);
    }

    return ok({ url: session.url }, 200);
  } catch (error) {
    console.error("POST /api/stripe/checkout error:", error);
    return serverError("POST /api/stripe/checkout", error);
  }
}
