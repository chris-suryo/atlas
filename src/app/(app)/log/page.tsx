export const metadata = { title: "Log" };

export default function LogPage() {
  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Log</h1>
        <p className="mt-1 text-sm text-muted">
          The natural-language logger is built next, after the parser-rules
          review.
        </p>
      </header>

      <div className="rounded-2xl border border-border bg-surface p-5 text-sm text-muted">
        <p>Coming here:</p>
        <p className="mt-2 font-mono text-foreground">
          incline db 60x10x3 @8
        </p>
        <p className="mt-2">
          → an editable sets grid (weight × reps × RPE) with{" "}
          <span className="text-foreground">last: 60×10×3</span> shown inline for
          quick progression, plus a RUN entry form.
        </p>
      </div>
    </section>
  );
}
