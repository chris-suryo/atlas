import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { WHOOP_API_BASE, whoopEnv } from "@/lib/whoop/config";
import { whoopTokenExchange } from "@/lib/whoop/oauth";
import { syncWhoop } from "@/lib/whoop/sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** WHOOP redirects here with ?code&state. Verify state, exchange the code, store
 *  tokens (session or service-role), backfill, and return to Today. Every outcome
 *  is written to public.whoop_debug so failures are diagnosable without logs. */
export async function GET(request: NextRequest) {
  const { origin, searchParams } = new URL(request.url);
  const supabase = await createClient();
  const admin = createAdminClient();
  const db = admin ?? supabase; // writer for debug + tokens

  const log = async (outcome: string, detail = "") => {
    try {
      if (db) await db.from("whoop_debug").insert({ outcome, detail: detail.slice(0, 500) });
    } catch {
      // diagnostics are best-effort
    }
  };
  const clear = (res: NextResponse) => {
    res.cookies.set("whoop_oauth_state", "", { maxAge: 0, path: "/" });
    return res;
  };
  const fail = async (reason: string, detail = "") => {
    await log(reason, detail);
    return clear(NextResponse.redirect(`${origin}/today?whoop=${reason}`));
  };

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const savedState = request.cookies.get("whoop_oauth_state")?.value;
  await log(
    "callback_hit",
    `hasCode=${!!code} hasState=${!!state} hasSavedCookie=${!!savedState} stateMatch=${state === savedState} adminPresent=${!!admin}`,
  );

  if (!code || !state || !savedState || state !== savedState) {
    return fail(
      "state",
      `hasCode=${!!code} hasState=${!!state} hasSavedCookie=${!!savedState} match=${state === savedState}`,
    );
  }
  if (!supabase) return fail("unconfigured", "no session client");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    await log("no_user", "");
    return clear(NextResponse.redirect(`${origin}/login`));
  }

  const { redirectUri } = whoopEnv();
  const exchange = await whoopTokenExchange({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });
  if (!exchange.ok) {
    return fail("token", `status=${exchange.status} method=${exchange.method} body=${exchange.body}`);
  }
  const tok = exchange.token;

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

  const { error } = await db!.from("whoop_connection").upsert(
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
  if (error) return fail("store", `via=${admin ? "admin" : "session"} ${error.message}`);
  await log("stored", `whoopUserId=${whoopUserId} via=${admin ? "admin" : "session"}`);

  try {
    const days = await syncWhoop(db!, user.id, 14);
    await log("connected", `syncDays=${days}`);
  } catch (e) {
    await log("sync_error", e instanceof Error ? e.message : String(e));
  }
  return clear(NextResponse.redirect(`${origin}/today?whoop=connected`));
}
