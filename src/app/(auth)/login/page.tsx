"use client";

import { useState } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);
  const configured = isSupabaseConfigured();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) {
        setError(error.message);
        setStatus("error");
      } else {
        setStatus("sent");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStatus("error");
    }
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-accent">
            Atlas
          </h1>
          <p className="mt-2 text-sm text-muted">
            Sign in to log your training.
          </p>
        </div>

        {!configured ? (
          <div className="rounded-2xl border border-border bg-surface p-5 text-sm text-muted">
            Supabase isn’t configured yet. Copy{" "}
            <span className="font-mono text-foreground">.env.example</span> to{" "}
            <span className="font-mono text-foreground">.env.local</span> and
            set{" "}
            <span className="font-mono text-foreground">
              NEXT_PUBLIC_SUPABASE_URL
            </span>{" "}
            and{" "}
            <span className="font-mono text-foreground">
              NEXT_PUBLIC_SUPABASE_ANON_KEY
            </span>
            .
          </div>
        ) : status === "sent" ? (
          <div className="rounded-2xl border border-border bg-surface p-5 text-center text-sm">
            <p className="text-foreground">Check your email.</p>
            <p className="mt-1 text-muted">
              We sent a magic link to {email}. Open it on this device to finish
              signing in.
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3">
            <input
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-foreground outline-none placeholder:text-muted focus:border-accent"
            />
            <button
              type="submit"
              disabled={status === "sending"}
              className="w-full rounded-xl bg-accent px-4 py-3 font-medium text-background transition-colors hover:bg-accent-strong disabled:opacity-60"
            >
              {status === "sending" ? "Sending…" : "Send magic link"}
            </button>
            {error && <p className="text-sm text-red-400">{error}</p>}
          </form>
        )}
      </div>
    </main>
  );
}
