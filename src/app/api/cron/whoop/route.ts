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
    const userId = c.user_id as string;
    try {
      const days = await syncWhoop(admin, userId, "cron");
      results.push({ user_id: userId, days });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      results.push({ user_id: userId, error: message });
      // syncWhoop only logs to whoop_debug on reaching its success path — if it
      // threw earlier (dead refresh token, WHOOP outage), nothing else records
      // this attempt, so log it here to keep the cron trace complete.
      try {
        await admin
          .from("whoop_debug")
          .insert({ outcome: "cron_error", detail: `source=cron user=${userId} ${message}`.slice(0, 500) });
      } catch {
        // diagnostics are best-effort
      }
    }
  }
  return Response.json({ ok: true, synced: results.length, results });
}
