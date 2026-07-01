import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncWhoop } from "@/lib/whoop/sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Manual "Sync WHOOP" (from Today). Identifies the user by session, syncs via
 *  the service-role client, and returns to Today. */
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
  try {
    await syncWhoop(db, user.id);
    return NextResponse.redirect(`${origin}/today?whoop=synced`, { status: 303 });
  } catch (e) {
    console.error("[whoop] manual sync failed —", e instanceof Error ? e.message : String(e));
    return NextResponse.redirect(`${origin}/today?whoop=error`, { status: 303 });
  }
}
