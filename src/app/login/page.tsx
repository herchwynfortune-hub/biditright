"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      if (!data.session) {
        setLoading(false);
        setConfirmationSent(true);
        return;
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
    }

    router.push("/library");
    router.refresh();
  }

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="card w-full max-w-sm p-8">
        <Link href="/" className="mb-8 flex items-center gap-2">
          <span className="h-7 w-7 rounded-full bg-gold border-2 border-ink" />
          <span className="text-lg font-bold">bid it right</span>
        </Link>

        {confirmationSent ? (
          <div className="flex flex-col gap-3 text-center">
            <p className="font-semibold">Check your email</p>
            <p className="text-sm text-ink-muted">
              We sent a confirmation link to <span className="font-medium text-ink">{email}</span>. Click it to
              activate your account, then come back here to sign in.
            </p>
            <button
              type="button"
              onClick={() => {
                setConfirmationSent(false);
                setMode("signin");
              }}
              className="btn btn-primary mt-2 py-3 text-base"
            >
              Back to sign in
            </button>
          </div>
        ) : (
          <>
        <div className="mb-6 flex rounded-[var(--radius-control)] bg-bg p-1 text-sm font-semibold">
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`flex-1 rounded-[10px] py-2 transition-colors ${
              mode === "signup" ? "bg-card shadow-sm" : "text-ink-muted"
            }`}
          >
            Sign up
          </button>
          <button
            type="button"
            onClick={() => setMode("signin")}
            className={`flex-1 rounded-[10px] py-2 transition-colors ${
              mode === "signin" ? "bg-card shadow-sm" : "text-ink-muted"
            }`}
          >
            Sign in
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === "signup" && (
            <label className="flex flex-col gap-1 text-sm font-medium">
              Name
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-[var(--radius-control)] border border-border px-3 py-2 text-base font-normal outline-none focus:border-teal-deep"
                placeholder="Your name"
              />
            </label>
          )}
          <label className="flex flex-col gap-1 text-sm font-medium">
            Email
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-[var(--radius-control)] border border-border px-3 py-2 text-base font-normal outline-none focus:border-teal-deep"
              placeholder="you@school.com"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Password
            <input
              required
              minLength={6}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-[var(--radius-control)] border border-border px-3 py-2 text-base font-normal outline-none focus:border-teal-deep"
              placeholder="At least 6 characters"
            />
          </label>

          {error && <p className="text-sm text-incorrect">{error}</p>}

          <button type="submit" disabled={loading} className="btn btn-primary mt-2 py-3 text-base disabled:opacity-60">
            {loading ? "Please wait…" : mode === "signup" ? "Create free account" : "Sign in"}
          </button>
        </form>
          </>
        )}
      </div>
    </div>
  );
}
