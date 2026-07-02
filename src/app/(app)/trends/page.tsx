export const metadata = { title: "Trends" };

export default function TrendsPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-7 pb-6 pt-[max(1.5rem,env(safe-area-inset-top))]">
        <h1 className="text-[26px] font-medium tracking-tight">Trends</h1>
        <p className="mt-10 text-sm leading-relaxed text-text-muted">
          Milestone 1 placeholder. Charts for anchor-lift progression, run pace,
          bodyweight, and ankle symptoms arrive in a later milestone.
        </p>
      </div>
      <form
        action="/auth/signout"
        method="post"
        className="shrink-0 px-7 pb-3.5 text-center"
      >
        <button type="submit" className="text-xs text-text-faint">
          Sign out
        </button>
      </form>
    </div>
  );
}
