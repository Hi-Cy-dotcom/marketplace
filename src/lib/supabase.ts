import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Placeholders keep `createClient` from throwing when env vars are missing
 * (e.g. during `next build` on CI or a first Vercel deploy). API routes check
 * `isSupabaseConfigured` and return a clear error instead of calling these.
 */
const PLACEHOLDER_URL = "https://placeholder.supabase.co";
const PLACEHOLDER_ANON_KEY = "placeholder-anon-key";

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || PLACEHOLDER_URL;
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || PLACEHOLDER_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

export const LISTING_IMAGES_BUCKET = "listing-images";

/**
 * Header read by the RLS policies on `messages` (see supabase-schema.sql).
 * There is no auth yet, so this only scopes reads to a claimed email address.
 */
export const USER_EMAIL_HEADER = "x-user-email";

const clientOptions = {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
} as const;

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, clientOptions);

/** Client that identifies the caller by email for RLS policies on `messages`. */
export function createEmailScopedClient(email: string): SupabaseClient {
  return createClient(supabaseUrl, supabaseAnonKey, {
    ...clientOptions,
    global: { headers: { [USER_EMAIL_HEADER]: email.trim().toLowerCase() } },
  });
}
