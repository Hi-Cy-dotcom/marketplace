import { fail, ok, requireSupabase, serverError } from "@/lib/api-response";
import { supabase } from "@/lib/supabase";
import type { Listing } from "@/lib/types";
import { isUuid } from "@/lib/validation";

// GET /api/listings/:id
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Malformed ids can never match a row, so treat them as "not found".
    if (!isUuid(id)) return fail("Listing not found", 404);

    const notConfigured = requireSupabase();
    if (notConfigured) return notConfigured;

    const { data, error } = await supabase.from("listings").select("*").eq("id", id).maybeSingle();
    if (error) return serverError("GET /api/listings/[id]", error);
    if (!data) return fail("Listing not found", 404);

    return ok<Listing>(data as Listing);
  } catch (error) {
    return serverError("GET /api/listings/[id]", error);
  }
}
