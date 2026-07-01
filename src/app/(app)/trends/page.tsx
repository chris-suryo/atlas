export const metadata = { title: "Trends" };

export default function TrendsPage() {
  return (
    <div className="h-full overflow-y-auto px-7 pb-6 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <h1 className="text-[26px] font-medium tracking-tight">Trends</h1>
      <p className="mt-10 text-sm leading-relaxed text-text-muted">
        Milestone 1 placeholder. Charts for anchor-lift progression, run pace,
        bodyweight, and ankle symptoms arrive in a later milestone.
      </p>
    </div>
  );
}
