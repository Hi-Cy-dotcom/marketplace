import { headers } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return new Response("No signature", { status: 400 });
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error("STRIPE_WEBHOOK_SECRET is not set");
    return new Response("Webhook secret not configured", { status: 500 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  // Handle checkout.session.completed
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as {
      id: string;
      payment_status: string;
      payment_intent: string | null;
      metadata?: {
        order_id?: string;
        listing_id?: string;
      };
      account?: string;
      customer_details?: {
        email?: string;
      };
    };

    // Only process paid sessions
    if (session.payment_status !== "paid") {
      return new Response("OK", { status: 200 });
    }

    const orderId = session.metadata?.order_id;
    if (!orderId) {
      console.error("No order_id in session metadata");
      return new Response("OK", { status: 200 });
    }

    // Load order to verify it belongs to us
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("stripe_session_id", session.id)
      .maybeSingle();

    if (!order) {
      // Order doesn't belong to us (shared sandbox)
      return new Response("OK", { status: 200 });
    }

    // Verify the account matches (shared sandbox check)
    if (session.account && session.account !== order.stripe_account_id) {
      console.error("Account mismatch for order", orderId);
      return new Response("OK", { status: 200 });
    }

    // Idempotent: only update if still pending
    if (order.status !== "pending") {
      return new Response("OK", { status: 200 });
    }

    // Mark order as paid
    const { error: orderError } = await supabaseAdmin
      .from("orders")
      .update({
        status: "paid",
        stripe_payment_intent_id: session.payment_intent,
        buyer_email: session.customer_details?.email || "",
        paid_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (orderError) {
      console.error("Failed to update order:", orderError);
      return new Response("OK", { status: 200 });
    }

    // Mark listing as sold (only if still available)
    const { data: listing } = await supabaseAdmin
      .from("listings")
      .select("*")
      .eq("id", order.listing_id)
      .maybeSingle();

    if (listing && listing.status === "available") {
      const { error: listingError } = await supabaseAdmin
        .from("listings")
        .update({ status: "sold", sold_at: new Date().toISOString() })
        .eq("id", order.listing_id)
        .eq("status", "available");

      if (listingError) {
        console.error("Failed to mark listing as sold:", listingError);
        // If listing was already sold by another order, mark this order for review
        await supabaseAdmin
          .from("orders")
          .update({ status: "needs_review" })
          .eq("id", orderId);
      }
    } else if (listing && listing.status === "sold") {
      // Listing was already sold by another order
      console.error("Listing already sold, marking order for review:", orderId);
      await supabaseAdmin
        .from("orders")
        .update({ status: "needs_review" })
        .eq("id", orderId);
    }
  }

  // Handle account.updated
  if (event.type === "account.updated") {
    const account = event.data.object as {
      id: string;
      charges_enabled: boolean;
      details_submitted: boolean;
    };

    // Update seller record
    const { error } = await supabaseAdmin
      .from("sellers")
      .update({
        charges_enabled: account.charges_enabled,
        details_submitted: account.details_submitted,
      })
      .eq("stripe_account_id", account.id);

    if (error) {
      // Account doesn't belong to us (shared sandbox)
      console.error("Failed to update seller or account not found:", error);
    }
  }

  return new Response("OK", { status: 200 });
}
