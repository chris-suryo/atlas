import type { SupabaseClient } from "@supabase/supabase-js";
import { whoopTokenExchange } from "./oauth";

type Conn = {
  access_token: string;
  refresh_token: string;
  expires_at: string;
};

const SKEW_MS = 60_000;

/**
 * A valid WHOOP access token, refreshing if within 60s of expiry. WHOOP rotates
 * the refresh token on every refresh, so the new access+refresh are written
 * atomically via compare-and-swap on the OLD refresh token — a concurrent
 * refresh can't clobber it (the loser re-reads the winner's token). Works with
 * the service-role client (cron) or the session client (owner-RLS).
 */
export async function ensureValidToken(
  db: SupabaseClient,
  userId: string,
): Promise<string> {
  const { data, error } = await db
    .from("whoop_connection")
    .select("access_token, refresh_token, expires_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) throw new Error("WHOOP not connected.");
  const conn = data as Conn;

  if (new Date(conn.expires_at).getTime() > Date.now() + SKEW_MS) {
    return conn.access_token;
  }

  const exchange = await whoopTokenExchange({
    grant_type: "refresh_token",
    refresh_token: conn.refresh_token,
    scope: "offline", // keep receiving a rotated refresh token
  });

  if (!exchange.ok) {
    console.error(
      `[whoop] token refresh failed ${exchange.status} (${exchange.method}) — ${exchange.body.slice(0, 200)}`,
    );
    // A concurrent refresh may already have rotated it — re-read once.
    const fresh = await readFresh(db, userId);
    if (fresh) return fresh;
    throw new Error(`WHOOP token refresh failed (${exchange.status}).`);
  }

  const tok = exchange.token;
  const expiresAt = new Date(Date.now() + tok.expires_in * 1000).toISOString();

  const { data: won } = await db
    .from("whoop_connection")
    .update({
      access_token: tok.access_token,
      refresh_token: tok.refresh_token,
      expires_at: expiresAt,
    })
    .eq("user_id", userId)
    .eq("refresh_token", conn.refresh_token) // CAS: only if still current
    .select("access_token")
    .maybeSingle();

  if (won) return tok.access_token;

  // Lost the race — return whatever the winner stored.
  const fresh = await readFresh(db, userId);
  return fresh ?? tok.access_token;
}

async function readFresh(
  db: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const { data } = await db
    .from("whoop_connection")
    .select("access_token, expires_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return null;
  const c = data as Pick<Conn, "access_token" | "expires_at">;
  return new Date(c.expires_at).getTime() > Date.now() + SKEW_MS ? c.access_token : null;
}
