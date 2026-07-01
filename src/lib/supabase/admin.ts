import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Service-role Supabase client for background jobs (cron / WHOOP ingest). It
 * BYPASSES RLS, so it is server-only — never import this into a client
 * component. Returns `null` when the service key is unset (build-safe).
 */
export function createAdminClient() {
  if (!url || !serviceKey) return null;
  return createSupabaseClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
