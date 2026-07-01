import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function isSupabaseConfigured(): boolean {
  return Boolean(url && anonKey);
}

/**
 * Server-side Supabase client for Server Components and Route Handlers.
 * Returns `null` when env vars are missing so callers can treat the request
 * as unauthenticated instead of crashing the render.
 */
export async function createClient() {
  if (!url || !anonKey) return null;

  const cookieStore = await cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Cookie writes from a Server Component are ignored; the proxy
          // (session refresh) is responsible for persisting refreshed tokens.
        }
      },
    },
  });
}
