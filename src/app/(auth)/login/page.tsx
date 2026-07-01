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
    <main className="flex min-h-dvh flex-col items-center justify-center px-7">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-medium tracking-tight text-accent">
            Atlas
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            Sign in to log your training.
          </p>
        </div>

        {!configured ? (
          <p className="text-sm leading-relaxed text-text-muted">
            Supabase isn’t configured yet. Copy{" "}
            <span className="text-text">.env.example</span> to{" "}
            <span className="text-text">.env.local</span> and set{" "}
            <span className="text-text">NEXT_PUBLIC_SUPABASE_URL</span> and{" "}
            <span className="text-text">NEXT_PUBLIC_SUPABASE_ANON_KEY</span>.
          </p>
        ) : status === "sent" ? (
          <div className="text-center text-sm">
            <p className="text-text">Check your email.</p>
            <p className="mt-1 text-text-muted">
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
              className="w-full border-b border-line bg-transparent px-1 py-3 text-text outline-none placeholder:text-text-faint focus:border-accent"
            />
            <button
              type="submit"
              disabled={status === "sending"}
              className="w-full rounded-control bg-accent px-4 py-3.5 font-medium text-accent-ink transition-opacity hover:opacity-90 disabled:opacity-60"
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
