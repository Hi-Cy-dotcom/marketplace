import { fail, ok, serverError } from "@/lib/api-response";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { Order, Listing } from "@/lib/types";

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
