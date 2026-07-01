import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Today" };

export default async function TodayPage() {
  const supabase = await createClient();
  const { data } = (await supabase?.auth.getUser()) ?? {
    data: { user: null },
  };
  const email = data?.user?.email ?? null;

  return (
    <section className="space-y-6">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Today</h1>
          {email && (
            <p className="mt-1 text-sm text-muted">Signed in as {email}</p>
          )}
        </div>
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted hover:text-foreground"
          >
            Sign out
          </button>
        </form>
      </header>

      <div className="rounded-2xl border border-border bg-surface p-5">
        <p className="text-sm text-muted">
          Milestone 1 placeholder. Your daily overview — planned session,
          readiness, ankle check — lands in a later milestone.
        </p>
      </div>
    </section>
  );
}
