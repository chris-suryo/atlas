import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { WHOOP_API_BASE, WHOOP_TOKEN_URL, whoopEnv } from "@/lib/whoop/config";
import { syncWhoop } from "@/lib/whoop/sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** WHOOP redirects here with ?code&state. Verify state, exchange the code, store
 *  tokens (service-role, server-only), backfill, and return to Today. */
export async function GET(request: NextRequest) {
  const { origin, searchParams } = new URL(request.url);
  const fail = (reason: string) =>
    NextResponse.redirect(`${origin}/today?whoop=${reason}`);

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const jar = await cookies();
  const savedState = jar.get("whoop_oauth_state")?.value;
  jar.delete("whoop_oauth_state");
  if (!code || !state || !savedState || state !== savedState) return fail("state");

  const supabase = await createClient();
  const admin = createAdminClient();
  if (!supabase || !admin) return fail("unconfigured");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/login`);

  const { clientId, clientSecret, redirectUri } = whoopEnv();
  const res = await fetch(WHOOP_TOKEN_URL, {
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
  if (!res.ok) return fail("token");
  const tok = (await res.json()) as {
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
    // profile is best-effort; tokens are what matter
  }

  const { error } = await admin.from("whoop_connection").upsert(
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
  if (error) return fail("store");

  try {
    await syncWhoop(admin, user.id, 14);
  } catch {
    // first sync is best-effort; the cron/manual sync will catch up
  }
  return NextResponse.redirect(`${origin}/today?whoop=connected`);
}
