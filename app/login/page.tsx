"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleAuth(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const redirectTo = `${window.location.origin}/auth/callback`;

    const result =
      mode === "signin"
        ? await supabase.auth.signInWithPassword({
            email,
            password,
          })
        : await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: redirectTo,
            },
          });

    setLoading(false);

    if (result.error) {
      setMessage(result.error.message);
      return;
    }

    if (mode === "signup") {
      setMessage("Check your email to confirm your account, then sign in.");
      return;
    }

    const next = new URLSearchParams(window.location.search).get("next") ?? "/upload";
    router.push(next);
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl">
        <div className="mb-8">
          <p className="text-sm font-medium text-cyan-400">PodMatch AI</p>
          <h1 className="mt-2 text-3xl font-bold">
            {mode === "signin" ? "Sign in" : "Create account"}
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Access your freight document review workspace.
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="text-sm text-slate-300">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="text-sm text-slate-300">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400"
              placeholder="Enter your password"
            />
          </div>

          {message ? (
            <div className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-300">
              {message}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-cyan-400 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? "Please wait..."
              : mode === "signin"
                ? "Sign in"
                : "Create account"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMessage("");
            setMode(mode === "signin" ? "signup" : "signin");
          }}
          className="mt-6 text-sm text-slate-400 hover:text-cyan-300"
        >
          {mode === "signin"
            ? "Need an account? Create one"
            : "Already have an account? Sign in"}
        </button>
      </div>
    </main>
  );
}


