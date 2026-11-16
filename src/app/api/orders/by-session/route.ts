import { fail, ok, serverError } from "@/lib/api-response";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { stripe } from "@/lib/stripe";
import { markOrderPaidFromSession } from "@/lib/stripe-order";
import type { Order, Listing } from "@/lib/types";

// Simple in-memory rate limit to avoid spamming Stripe
const reconciliationCache = new Map<string, number>();
const RECONCILIATION_COOLDOWN_MS = 5000; // 5 seconds

// GET /api/orders/by-session?session_id=
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("session_id");

    if (!sessionId) {
      return fail("session_id is required", 400);
    }

    // Load order with listing details
    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select(`
        *,
        listings:listing_id (
          title,
          image_url
        )
      `)
      .eq("stripe_session_id", sessionId)
      .maybeSingle();

    if (error || !order) {
      return fail("Order not found", 404);
    }

    const listing = order.listings as Listing | null;

    // Reconciliation fallback: if order is still pending, check Stripe directly
    if (order.status === "pending") {
      const now = Date.now();
      const lastReconciled = reconciliationCache.get(sessionId) || 0;

      // Only reconcile if we haven't tried recently
      if (now - lastReconciled > RECONCILIATION_COOLDOWN_MS) {
        reconciliationCache.set(sessionId, now);

        try {
          const session = await stripe.checkout.sessions.retrieve(
            sessionId,
            undefined,
            { stripeAccount: order.stripe_account_id }
          );

          if (session.payment_status === "paid") {
            await markOrderPaidFromSession(session, order.stripe_account_id);

            // Reload order to get updated status
            const { data: updatedOrder } = await supabaseAdmin
              .from("orders")
              .select("*")
              .eq("id", order.id)
              .single();

            if (updatedOrder) {
              return ok({
                status: updatedOrder.status,
                listingTitle: listing?.title || "Unknown item",
                listingImage: listing?.image_url || null,
                amountTotal: order.amount_total,
                currency: order.currency,
              });
            }
          }
        } catch (stripeError) {
          console.error("Failed to reconcile with Stripe:", stripeError);
          // Continue with current order status
        }
      }
    }

    return ok({
      status: order.status,
      listingTitle: listing?.title || "Unknown item",
      listingImage: listing?.image_url || null,
      amountTotal: order.amount_total,
      currency: order.currency,
    });
  } catch (error) {
    console.error("GET /api/orders/by-session error:", error);
    return serverError("GET /api/orders/by-session", error);
  }
}
