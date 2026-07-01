"use client";

import { useState } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { ensureSeeded } from "@/lib/actions/seed";

export default function LoginPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const configured = isSupabaseConfigured();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data, error } =
        mode === "signin"
          ? await supabase.auth.signInWithPassword({ email, password })
          : await supabase.auth.signUp({ email, password });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      if (!data.session) {
        // Only happens if email confirmation is still enabled on the project.
        setError("Check your email to confirm your account, then sign in.");
        setLoading(false);
        return;
      }
      // Seed the library on first sign-in; don't block login if it hiccups.
      try {
        await ensureSeeded();
      } catch {}
      window.location.assign("/today");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-7">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-medium tracking-tight text-accent">
            Atlas
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            {mode === "signin"
              ? "Sign in to log your training."
              : "Create your account."}
          </p>
        </div>

        {!configured ? (
          <p className="text-sm leading-relaxed text-text-muted">
            Supabase isn’t configured yet. Set{" "}
            <span className="text-text">NEXT_PUBLIC_SUPABASE_URL</span> and{" "}
            <span className="text-text">NEXT_PUBLIC_SUPABASE_ANON_KEY</span>.
          </p>
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
              className="w-full border-b border-line bg-transparent px-1 py-3 text-text outline-none placeholder:text-text-faint focus:border-accent"
            />
            <input
              type="password"
              required
              minLength={6}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              placeholder="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border-b border-line bg-transparent px-1 py-3 text-text outline-none placeholder:text-text-faint focus:border-accent"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-control bg-accent px-4 py-3.5 font-medium text-accent-ink transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {loading
                ? "…"
                : mode === "signin"
                  ? "Sign in"
                  : "Create account"}
            </button>
            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
              type="button"
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setError(null);
              }}
              className="w-full pt-2 text-center text-xs text-text-faint"
            >
              {mode === "signin"
                ? "First time? Create an account"
                : "Have an account? Sign in"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
