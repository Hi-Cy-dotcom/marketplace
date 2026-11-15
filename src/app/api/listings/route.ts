import type { NextRequest } from "next/server";
import { fail, ok, readJson, requireSupabase, serverError } from "@/lib/api-response";
import { CATEGORY_SLUGS } from "@/lib/categories";
import { supabase } from "@/lib/supabase";
import type { Listing } from "@/lib/types";
import { validateListingInput } from "@/lib/validation";

const MAX_SEARCH_LENGTH = 100;
const DEFAULT_LIMIT = 60;
const MAX_LIMIT = 100;

/** Strips characters with special meaning in PostgREST filters and LIKE patterns. */
function sanitizeSearch(term: string): string {
  return term.replace(/[%_*,().\\:"']/g, " ").replace(/\s+/g, " ").trim();
}

// GET /api/listings?search=&category=&limit=
export async function GET(request: NextRequest) {
  try {
    const notConfigured = requireSupabase();
    if (notConfigured) return notConfigured;

    const params = request.nextUrl.searchParams;
    const rawSearch = params.get("search")?.trim() ?? "";
    const category = params.get("category")?.trim() ?? "";
    const rawLimit = params.get("limit");

    if (rawSearch.length > MAX_SEARCH_LENGTH) {
      return fail(`search must be ${MAX_SEARCH_LENGTH} characters or fewer`, 400);
    }
    if (category && !CATEGORY_SLUGS.includes(category)) {
      return fail(`Unknown category "${category}"`, 400);
    }
    const limit = rawLimit === null ? DEFAULT_LIMIT : Number(rawLimit);
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
      return fail(`limit must be an integer between 1 and ${MAX_LIMIT}`, 400);
    }

    let query = supabase
      .from("listings")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (category) query = query.eq("category", category);

    const search = sanitizeSearch(rawSearch);
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) return serverError("GET /api/listings", error);

    return ok<Listing[]>((data ?? []) as Listing[]);
  } catch (error) {
    return serverError("GET /api/listings", error);
  }
}

// POST /api/listings
export async function POST(request: Request) {
  try {
    const notConfigured = requireSupabase();
    if (notConfigured) return notConfigured;

    const body = await readJson(request);
    if (body === undefined || typeof body !== "object" || body === null) {
      return fail("Request body must be a JSON object", 400);
    }

    const { value, errors } = validateListingInput(body);
    if (!value) return fail("Invalid listing data", 400, errors as Record<string, string>);

    const { data, error } = await supabase.from("listings").insert(value).select().single();
    if (error) {
      if (error.code === "23514") return fail("Listing data failed validation", 400);
      return serverError("POST /api/listings", error);
    }

    return ok<Listing>(data as Listing, 201);
  } catch (error) {
    return serverError("POST /api/listings", error);
  }
}
