import { createAdminClient } from "@/lib/supabase/admin";
import { syncWhoop } from "@/lib/whoop/sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Daily reconciliation cron (Vercel Cron → vercel.json). Refreshes the token and
 * re-pulls recovery/sleep/cycle for every connected user. Guarded by CRON_SECRET
 * (Vercel sends it as `Authorization: Bearer <CRON_SECRET>`).
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const admin = createAdminClient();
  if (!admin) return Response.json({ ok: false, error: "unconfigured" }, { status: 500 });

  const { data: conns } = await admin.from("whoop_connection").select("user_id");
  const results: { user_id: string; days?: number; error?: string }[] = [];
  for (const c of conns ?? []) {
    try {
      const days = await syncWhoop(admin, c.user_id as string);
      results.push({ user_id: c.user_id as string, days });
    } catch (e) {
      results.push({
        user_id: c.user_id as string,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }
  return Response.json({ ok: true, synced: results.length, results });
}
