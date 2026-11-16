import { supabaseAdmin } from "@/lib/supabase-admin";
import { stripe } from "@/lib/stripe";

interface SessionData {
  id: string;
  payment_status: string;
  payment_intent: string | { id: string } | null;
  metadata: Record<string, string> | null;
  customer_details: {
    email: string | null;
  } | null;
}

/**
 * Shared function to mark an order as paid from a Stripe Checkout Session.
 * Used by both the webhook handler and the reconciliation fallback.
 * Idempotent: safe to call multiple times.
 */
export async function markOrderPaidFromSession(
  session: SessionData,
  stripeAccountId: string
): Promise<{ success: boolean; status: string }> {
  const orderId = session.metadata?.order_id;
  if (!orderId) {
    console.error("No order_id in session metadata");
    return { success: false, status: "no_order_id" };
  }

  // Only process paid sessions
  if (session.payment_status !== "paid") {
    return { success: false, status: "not_paid" };
  }

  // Load order to verify it exists and is still pending
  const { data: order } = await supabaseAdmin
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();

  if (!order) {
    console.error("Order not found:", orderId);
    return { success: false, status: "order_not_found" };
  }

  // Verify the account matches
  if (order.stripe_account_id !== stripeAccountId) {
    console.error("Account mismatch for order", orderId);
    return { success: false, status: "account_mismatch" };
  }

  // Idempotent: only update if still pending
  if (order.status !== "pending") {
    return { success: true, status: order.status };
  }

  // Mark order as paid
  const { error: orderError } = await supabaseAdmin
    .from("orders")
    .update({
      status: "paid",
      stripe_payment_intent_id: session.payment_intent,
      buyer_email: session.customer_details?.email || null,
      paid_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  if (orderError) {
    console.error("Failed to update order:", orderError);
    return { success: false, status: "update_failed" };
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
      return { success: true, status: "needs_review" };
    }
  } else if (listing && listing.status === "sold") {
    // Listing was already sold by another order
    console.error("Listing already sold, marking order for review:", orderId);
    await supabaseAdmin
      .from("orders")
      .update({ status: "needs_review" })
      .eq("id", orderId);
    return { success: true, status: "needs_review" };
  }

  return { success: true, status: "paid" };
}
