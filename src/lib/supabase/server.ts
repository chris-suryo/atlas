import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { cache } from "react";

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

/**
 * The signed-in user, memoized per request (React `cache`) — layout's auth
 * gate and a page's own lookup (e.g. to pass into `ensureSeeded`) share one
 * network round trip instead of each calling `auth.getUser()` separately.
 */
export const getUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
