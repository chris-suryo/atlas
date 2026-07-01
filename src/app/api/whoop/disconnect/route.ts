import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { WHOOP_API_BASE, whoopEnv } from "@/lib/whoop/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Disconnect WHOOP: best-effort token revoke, then delete the connection row
 *  (Today returns to the empty state). */
export async function POST(request: NextRequest) {
  const { origin } = new URL(request.url);
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.redirect(`${origin}/today?whoop=unconfigured`, { status: 303 });
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/login`, { status: 303 });

  const db = createAdminClient() ?? supabase; // service-role preferred, session fallback
  const { data: conn } = await db
    .from("whoop_connection")
    .select("access_token")
    .eq("user_id", user.id)
    .maybeSingle();

  if (conn?.access_token) {
    const { clientId, clientSecret } = whoopEnv();
    try {
      await fetch(`${WHOOP_API_BASE}/oauth/oauth2/revoke`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        cache: "no-store",
        body: new URLSearchParams({
          token: conn.access_token as string,
          client_id: clientId,
          client_secret: clientSecret,
        }),
      });
    } catch {
      // best-effort revoke; we delete regardless
    }
  }

  await db.from("whoop_connection").delete().eq("user_id", user.id);
  return NextResponse.redirect(`${origin}/today?whoop=disconnected`, { status: 303 });
}
