import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { whoopEnv } from "@/lib/whoop/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Env/config self-check (sign-in required). Reports PRESENCE of secrets as
 * booleans — never their values — plus the public redirect URI + Supabase URL so
 * they can be compared against the WHOOP dashboard. Temporary diagnostics.
 */
export async function GET() {
  const supabase = await createClient();
  const { data } = supabase
    ? await supabase.auth.getUser()
    : { data: { user: null } };
  if (!data?.user) {
    return NextResponse.json({ error: "sign in first" }, { status: 401 });
  }

  const e = whoopEnv();
  return NextResponse.json({
    whoop: {
      hasClientId: !!e.clientId,
      hasClientSecret: !!e.clientSecret,
      redirectUri: e.redirectUri || null, // must EXACTLY match the WHOOP dashboard
    },
    supabase: {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? null, // public, committed
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      adminClientAvailable: !!createAdminClient(),
    },
    cron: { hasCronSecret: !!process.env.CRON_SECRET },
  });
}
