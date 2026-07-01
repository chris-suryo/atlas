import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Today" };

export default async function TodayPage() {
  const supabase = await createClient();
  const { data } = (await supabase?.auth.getUser()) ?? {
    data: { user: null },
  };
  const email = data?.user?.email ?? null;

  return (
    <div className="h-full overflow-y-auto px-7 pb-6 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <header className="flex items-start justify-between">
        <h1 className="text-[26px] font-medium tracking-tight">Today</h1>
        <form action="/auth/signout" method="post">
          <button type="submit" className="py-1 text-xs text-text-faint">
            Sign out
          </button>
        </form>
      </header>

      {email && <p className="mt-1 text-xs text-text-faint">{email}</p>}

      <p className="mt-10 text-sm leading-relaxed text-text-muted">
        Milestone 1 placeholder. Your daily overview — planned session,
        readiness, ankle check — lands in a later milestone.
      </p>
    </div>
  );
}
