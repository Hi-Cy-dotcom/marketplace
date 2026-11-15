import type { NextRequest } from "next/server";
import { Resend } from "resend";
import { fail, ok, readJson, requireSupabase, serverError } from "@/lib/api-response";
import { createEmailScopedClient, supabase } from "@/lib/supabase";
import type { Message } from "@/lib/types";
import { isValidEmail } from "@/lib/utils";
import { isUuid, validateMessageInput } from "@/lib/validation";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// GET /api/messages?listing_id=<uuid>&email=<seller-or-buyer-email>
// Messages are private: RLS only returns rows where `email` is the seller or buyer.
export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const listingId = params.get("listing_id")?.trim() ?? "";
    const email = params.get("email")?.trim().toLowerCase() ?? "";

    const details: Record<string, string> = {};
    if (!isUuid(listingId)) details.listing_id = "A valid listing_id is required";
    if (!email || !isValidEmail(email)) {
      details.email = "A valid email (the seller's or buyer's) is required to read messages";
    }
    if (Object.keys(details).length > 0) return fail("Invalid query parameters", 400, details);

    const notConfigured = requireSupabase();
    if (notConfigured) return notConfigured;

    const { data: listing, error: listingError } = await supabase
      .from("listings")
      .select("id")
      .eq("id", listingId)
      .maybeSingle();
    if (listingError) return serverError("GET /api/messages (listing lookup)", listingError);
    if (!listing) return fail("Listing not found", 404);

    const { data, error } = await createEmailScopedClient(email)
      .from("messages")
      .select("*")
      .eq("listing_id", listingId)
      .order("created_at", { ascending: false });
    if (error) return serverError("GET /api/messages", error);

    return ok<Message[]>((data ?? []) as Message[]);
  } catch (error) {
    return serverError("GET /api/messages", error);
  }
}

// POST /api/messages  { listing_id, buyer_email, message }
export async function POST(request: Request) {
  try {
    const notConfigured = requireSupabase();
    if (notConfigured) return notConfigured;

    const body = await readJson(request);
    if (body === undefined || typeof body !== "object" || body === null) {
      return fail("Request body must be a JSON object", 400);
    }

    const { value, errors } = validateMessageInput(body);
    if (!value) return fail("Invalid message data", 400, errors as Record<string, string>);

    const { data: listing, error: listingError } = await supabase
      .from("listings")
      .select("id, seller_email")
      .eq("id", value.listing_id)
      .maybeSingle();
    if (listingError) return serverError("POST /api/messages (listing lookup)", listingError);
    if (!listing) return fail("Listing not found", 404);

    if (listing.seller_email === value.buyer_email) {
      return fail("You can't message yourself about your own listing", 400, {
        buyer_email: "This is the seller's email address",
      });
    }

    // Scoped to the buyer so RLS lets us read back the inserted row.
    const { data, error } = await createEmailScopedClient(value.buyer_email)
      .from("messages")
      .insert({ ...value, seller_email: listing.seller_email })
      .select()
      .single();
    if (error) {
      if (error.code === "23503") return fail("Listing not found", 404);
      if (error.code === "23514") return fail("Message data failed validation", 400);
      return serverError("POST /api/messages", error);
    }

    // Send email notification to seller
    if (resend && listing.seller_email) {
      try {
        await resend.emails.send({
          from: "Marketplace <onboarding@resend.dev>",
          to: listing.seller_email,
          subject: `New message about your listing`,
          html: `
            <h2>You received a new message</h2>
            <p>A buyer sent you a message:</p>
            <blockquote style="border-left: 3px solid #ccc; padding-left: 10px; margin: 10px 0;">
              ${value.message}
            </blockquote>
            <p><strong>From:</strong> ${value.buyer_email}</p>
            <p>Reply to this buyer at ${value.buyer_email}</p>
          `,
        });
      } catch (emailError) {
        // Log email error but don't fail the request - message was still stored
        console.error("Failed to send email notification:", emailError);
      }
    }

    return ok<Message>(data as Message, 201);
  } catch (error) {
    return serverError("POST /api/messages", error);
  }
}
