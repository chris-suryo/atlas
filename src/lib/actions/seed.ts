"use server";

import { createClient } from "@/lib/supabase/server";
import { SEED_EXERCISES } from "@/lib/data/seed-data";

/**
 * First-run seed: if the signed-in user has no exercises, insert the 45-row
 * library for auth.uid(). Idempotent and safe to call on every load — the
 * count check skips work once seeded, and the upsert ignores duplicates so
 * concurrent calls can't create dupes (protected by unique(user_id, name)).
 */
export async function ensureSeeded(): Promise<void> {
  const supabase = await createClient();
  if (!supabase) return;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { count } = await supabase
    .from("exercises")
    .select("id", { count: "exact", head: true });
  if ((count ?? 0) > 0) return;

  const rows = SEED_EXERCISES.map((e) => ({ user_id: user.id, ...e }));
  await supabase
    .from("exercises")
    .upsert(rows, { onConflict: "user_id,name", ignoreDuplicates: true });
}
