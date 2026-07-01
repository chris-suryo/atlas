export const metadata = { title: "Log" };

export default function LogPage() {
  return (
    <div className="h-full overflow-y-auto px-7 pb-6 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <h1 className="text-[26px] font-medium tracking-tight">Log</h1>
      <p className="mt-10 text-sm leading-relaxed text-text-muted">
        The keypad logger and natural-language composer are being built next,
        per the design system in{" "}
        <span className="text-text">docs/design/ATLAS-DESIGN-SYSTEM.md</span>.
      </p>
    </div>
  );
}
