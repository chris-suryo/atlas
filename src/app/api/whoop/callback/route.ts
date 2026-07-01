import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { WHOOP_API_BASE, WHOOP_TOKEN_URL, whoopEnv } from "@/lib/whoop/config";
import { syncWhoop } from "@/lib/whoop/sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** WHOOP redirects here with ?code&state. Verify state, exchange the code, store
 *  tokens (owner-RLS via the session; service-role preferred when available),
 *  backfill, and return to Today. Token writes work through the user session, so
 *  connecting does NOT require SUPABASE_SERVICE_ROLE_KEY (only the cron does). */
export async function GET(request: NextRequest) {
  const { origin, searchParams } = new URL(request.url);
  const clear = (res: NextResponse) => {
    res.cookies.set("whoop_oauth_state", "", { maxAge: 0, path: "/" });
    return res;
  };
  const fail = (reason: string) =>
    clear(NextResponse.redirect(`${origin}/today?whoop=${reason}`));

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const savedState = request.cookies.get("whoop_oauth_state")?.value;
  if (!code || !state || !savedState || state !== savedState) {
    console.error("[whoop] callback: state check failed", {
      hasCode: !!code,
      hasState: !!state,
      hasSavedState: !!savedState,
      match: state === savedState,
    });
    return fail("state");
  }

  const supabase = await createClient();
  if (!supabase) {
    console.error("[whoop] callback: supabase (session) client unconfigured");
    return fail("unconfigured");
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return clear(NextResponse.redirect(`${origin}/login`));

  const admin = createAdminClient();
  const db = admin ?? supabase; // prefer service-role; fall back to the session
  console.log(
    `[whoop] callback: admin client ${admin ? "present" : "MISSING → using session client"}`,
  );

  const { clientId, clientSecret, redirectUri } = whoopEnv();
  const tokenRes = await fetch(WHOOP_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    cache: "no-store",
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  if (!tokenRes.ok) {
    const body = await tokenRes.text().catch(() => "");
    console.error(
      `[whoop] callback: token exchange failed ${tokenRes.status} — ${body.slice(0, 300)}`,
    );
    return fail("token");
  }
  const tok = (await tokenRes.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    scope?: string;
  };

  let whoopUserId: number | null = null;
  try {
    const prof = await fetch(`${WHOOP_API_BASE}/v2/user/profile/basic`, {
      headers: { Authorization: `Bearer ${tok.access_token}` },
      cache: "no-store",
    });
    if (prof.ok) whoopUserId = ((await prof.json()) as { user_id?: number }).user_id ?? null;
  } catch {
    // best-effort
  }

  const { error } = await db.from("whoop_connection").upsert(
    {
      user_id: user.id,
      whoop_user_id: whoopUserId,
      access_token: tok.access_token,
      refresh_token: tok.refresh_token,
      expires_at: new Date(Date.now() + tok.expires_in * 1000).toISOString(),
      scope: tok.scope ?? null,
      connected_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) {
    console.error("[whoop] callback: token store failed —", error.message);
    return fail("store");
  }
  console.log("[whoop] callback: tokens stored for user", user.id);

  try {
    const days = await syncWhoop(db, user.id, 14);
    console.log(`[whoop] callback: initial sync upserted ${days} day(s)`);
  } catch (e) {
    console.error(
      "[whoop] callback: initial sync failed —",
      e instanceof Error ? e.message : String(e),
    );
  }
  return clear(NextResponse.redirect(`${origin}/today?whoop=connected`));
}
