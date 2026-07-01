"use server";

import { createClient } from "@/lib/supabase/server";

type Result = { ok: true } | { ok: false; error: string };

/**
 * Upsert today's ankle pain (0–10, lower = better). One row per (user, date);
 * on conflict only `pain_0_10` is updated, so `did_durability_work` is preserved.
 */
export async function logAnklePain(input: {
  date: string;
  pain: number;
}): Promise<Result> {
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const pain = Math.max(0, Math.min(10, Math.round(input.pain)));
  const { error } = await supabase
    .from("ankle_logs")
    .upsert(
      { user_id: user.id, date: input.date, pain_0_10: pain },
      { onConflict: "user_id,date" },
    );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
