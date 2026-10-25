"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const SUBJECTS = [
  { value: "english_grammar", label: "English grammar" },
  { value: "vocabulary", label: "Vocabulary" },
  { value: "maths", label: "Maths" },
  { value: "science", label: "Science" },
  { value: "history", label: "History" },
  { value: "other", label: "Other" },
];

export default function NewSetPage() {
  const router = useRouter();
  const supabase = createClient();
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("english_grammar");
  const [level, setLevel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    const { data, error } = await supabase
      .from("sets")
      .insert({ title, subject, level: level || null, owner_id: user.id })
      .select()
      .single();

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push(`/sets/${data.id}`);
  }

  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-6 py-10">
      <h1 className="mb-6 text-2xl font-bold">New set</h1>
      <form onSubmit={handleSubmit} className="card flex flex-col gap-4 p-6">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Title
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Present perfect vs past simple"
            className="rounded-[var(--radius-control)] border border-border px-3 py-2 text-base font-normal outline-none focus:border-teal-deep"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Subject
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="rounded-[var(--radius-control)] border border-border px-3 py-2 text-base font-normal outline-none focus:border-teal-deep"
          >
            {SUBJECTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Level <span className="font-normal text-ink-muted">(optional)</span>
          <input
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            placeholder="e.g. B1, or Grade 6"
            className="rounded-[var(--radius-control)] border border-border px-3 py-2 text-base font-normal outline-none focus:border-teal-deep"
          />
        </label>

        {error && <p className="text-sm text-incorrect">{error}</p>}

        <button type="submit" disabled={loading} className="btn btn-primary mt-2 py-3 text-base disabled:opacity-60">
          {loading ? "Creating…" : "Create set and add statements"}
        </button>
      </form>
    </div>
  );
}
