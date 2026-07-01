export const metadata = { title: "Privacy — Atlas" };

/**
 * Public privacy page (outside the (app) auth group). WHOOP's developer
 * dashboard points here. Tokens-only styling; no data, no auth.
 */
export default function PrivacyPage() {
  return (
    <main className="mx-auto min-h-dvh max-w-md px-7 py-[max(2rem,env(safe-area-inset-top))]">
      <h1 className="text-[26px] font-medium tracking-tight">Privacy</h1>
      <p className="mt-2 text-sm text-text-muted">Atlas · personal fitness app</p>

      <div className="mt-8 space-y-5 text-[15px] leading-relaxed text-text-muted">
        <p>
          Atlas is a <span className="text-text">personal, single-user</span> app
          built for one person to track their own training. It is not a product for
          other people and has no other users.
        </p>
        <p>
          When you connect WHOOP, Atlas reads{" "}
          <span className="text-text">your own</span> recovery, sleep, strain, and
          workout data through WHOOP&rsquo;s API, solely to show it back to you on
          your dashboard and to tailor your own workout suggestions.
        </p>
        <p>
          That data is stored in a <span className="text-text">private database</span>{" "}
          (Supabase) that only you can access, protected by row-level security. Your
          WHOOP access tokens are kept server-side and are never exposed to the
          browser.
        </p>
        <p>
          Atlas <span className="text-text">never sells or shares</span> your data
          with anyone, and shows no ads. There is no third party it is handed to.
        </p>
        <p>
          You can <span className="text-text">disconnect WHOOP at any time</span> from
          the Today screen — this revokes Atlas&rsquo;s access and deletes the stored
          connection. You can request deletion of the imported data at any time.
        </p>
      </div>

      <p className="mt-10 text-xs text-text-faint">
        Questions: contact the app owner directly.
      </p>
    </main>
  );
}
