import { fail, ok, serverError } from "@/lib/api-response";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { Listing, Seller } from "@/lib/types";

// GET /api/listings/[id]/can-buy
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: listingId } = await params;

    // Load listing
    const { data: listing, error: listingError } = await supabaseAdmin
      .from("listings")
      .select("*")
      .eq("id", listingId)
      .maybeSingle();

    if (listingError || !listing) {
      return fail("Listing not found", 404);
    }

    // Check if sold
    if (listing.status === "sold") {
      return ok({ canBuy: false, reason: "sold" as const });
    }

    // Check price minimum (Stripe minimum is $0.50)
    if (listing.price < 0.5) {
      return ok({ canBuy: false, reason: "price_too_low" as const });
    }

    // Load seller
    const { data: seller, error: sellerError } = await supabaseAdmin
      .from("sellers")
      .select("*")
      .eq("email", listing.seller_email)
      .maybeSingle();

    if (sellerError || !seller) {
      return ok({ canBuy: false, reason: "seller_not_onboarded" as const });
    }

    if (!seller.charges_enabled) {
      return ok({ canBuy: false, reason: "seller_not_onboarded" as const });
    }

    return ok({ canBuy: true, reason: null });
  } catch (error) {
    console.error("GET /api/listings/[id]/can-buy error:", error);
    return serverError("GET /api/listings/[id]/can-buy", error);
  }
}
