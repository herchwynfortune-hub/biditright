"use client";

import { useState } from "react";
import Link from "next/link";
import { openCheckout, PRICE_MONTHLY, PRICE_ANNUAL } from "@/lib/paddle/client";

const PRO_FEATURES = [
  "Unlimited saved sets",
  "Up to 10 teams per game",
  "Full premade set library",
  "Duplicate & customize any premade set",
  "Per-student error reports",
  "Homework / solo mode",
  "All 5 themes + your own logo",
  "Export sets to a PDF worksheet",
];

export default function UpgradeClient({
  teacherId,
  email,
  plan,
  subscriptionStatus,
  currentPeriodEndsAt,
}: {
  teacherId: string;
  email: string;
  plan: "free" | "pro";
  subscriptionStatus: string | null;
  currentPeriodEndsAt: string | null;
}) {
  const [billing, setBilling] = useState<"monthly" | "annual">("annual");
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpgrade() {
    setOpening(true);
    setError(null);
    try {
      await openCheckout({
        priceId: billing === "monthly" ? PRICE_MONTHLY : PRICE_ANNUAL,
        teacherId,
        email,
      });
    } catch {
      setError("Couldn't open checkout. Please try again.");
    } finally {
      setOpening(false);
    }
  }

  if (plan === "pro") {
    return (
      <div className="mx-auto w-full max-w-lg flex-1 px-6 py-16 text-center">
        <span className="mb-3 inline-block rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
          Pro
        </span>
        <h1 className="mb-2 text-2xl font-bold">You&apos;re on Pro</h1>
        <p className="text-sm text-ink-muted">
          {subscriptionStatus === "active" && currentPeriodEndsAt
            ? `Renews ${new Date(currentPeriodEndsAt).toLocaleDateString()}.`
            : subscriptionStatus
              ? `Status: ${subscriptionStatus}`
              : "Thanks for supporting Bid It Right."}
        </p>
        <Link href="/library/my-sets" className="btn btn-secondary mt-6 inline-block px-5 py-2.5 text-sm">
          Back to my sets
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-3xl font-bold">Upgrade to Pro</h1>
        <p className="text-ink-muted">Everything in Free, plus the tools for teaching every week.</p>
      </div>

      <div className="mb-8 flex justify-center">
        <div className="inline-flex rounded-[var(--radius-control)] bg-card p-1 shadow-sm">
          <button
            onClick={() => setBilling("monthly")}
            className={`rounded-[10px] px-4 py-2 text-sm font-semibold ${
              billing === "monthly" ? "bg-bg" : "text-ink-muted"
            }`}
          >
            Monthly — $9.99/mo
          </button>
          <button
            onClick={() => setBilling("annual")}
            className={`rounded-[10px] px-4 py-2 text-sm font-semibold ${
              billing === "annual" ? "bg-bg" : "text-ink-muted"
            }`}
          >
            Annual — $89.99/yr
            <span className="ml-1.5 rounded-full bg-gold px-1.5 py-0.5 text-[10px] font-bold">Save 25%</span>
          </button>
        </div>
      </div>

      <div className="card mx-auto max-w-md p-8">
        <ul className="mb-6 flex flex-col gap-2.5 text-sm">
          {PRO_FEATURES.map((f) => (
            <li key={f} className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-teal-deep" />
              {f}
            </li>
          ))}
        </ul>

        {error && <p className="mb-3 text-sm text-incorrect">{error}</p>}

        <button onClick={handleUpgrade} disabled={opening} className="btn btn-primary w-full py-3 text-base disabled:opacity-60">
          {opening ? "Opening checkout…" : `Upgrade — ${billing === "monthly" ? "$9.99/mo" : "$89.99/yr"}`}
        </button>
        <p className="mt-3 text-center text-xs text-ink-muted">Cancel anytime. Billed in USD via Paddle.</p>
      </div>
    </div>
  );
}
