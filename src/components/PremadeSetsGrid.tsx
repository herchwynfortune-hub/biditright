"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { PremadeSetSummary } from "@/lib/game/types";

export default function PremadeSetsGrid({ sets, isPro }: { sets: PremadeSetSummary[]; isPro: boolean }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sets;
    return sets.filter(
      (s) => s.title.toLowerCase().includes(q) || s.subject.toLowerCase().includes(q) || (s.level ?? "").toLowerCase().includes(q)
    );
  }, [sets, query]);

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search sets by title, subject, or level…"
        className="mb-6 w-full rounded-[var(--radius-control)] border border-border px-4 py-2.5 text-base outline-none focus:border-teal-deep"
      />

      {filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-ink-muted">No sets match &quot;{query}&quot;.</p>
      ) : (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((set) => {
            const locked = !isPro && set.pack_id !== "starter";
            return (
              <Link
                key={set.id}
                href={`/sets/${set.id}`}
                className="card flex flex-col gap-2 p-5 transition-shadow hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-bold">{set.title}</h3>
                  {locked && (
                    <span className="rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                      Pro
                    </span>
                  )}
                </div>
                <p className="text-sm text-ink-muted">
                  {set.level ? `${set.level} · ` : ""}
                  {set.statement_count} statements
                </p>
              </Link>
            );
          })}
        </section>
      )}
    </div>
  );
}
