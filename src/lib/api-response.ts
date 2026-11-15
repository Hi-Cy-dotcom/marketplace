import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase";
import type { ApiError, ApiSuccess } from "@/lib/types";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json<ApiSuccess<T>>({ data }, { status });
}

export function fail(error: string, status: number, details?: Record<string, string>) {
  const body: ApiError = details ? { error, details } : { error };
  return NextResponse.json<ApiError>(body, { status });
}

/** Returns an error response when Supabase env vars are missing, otherwise null. */
export function requireSupabase() {
  if (isSupabaseConfigured) return null;
  return fail(
    "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    500,
  );
}

export async function readJson(request: Request): Promise<unknown | undefined> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}

/** Logs the real error server-side and returns a generic 500. */
export function serverError(context: string, error: unknown) {
  console.error(`[api] ${context}:`, error);
  return fail("Something went wrong. Please try again.", 500);
}
