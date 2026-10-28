"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import UpgradeModal from "@/components/UpgradeModal";

const SUBJECTS = [
  { value: "english_grammar", label: "English grammar" },
  { value: "vocabulary", label: "Vocabulary" },
  { value: "maths", label: "Maths" },
  { value: "science", label: "Science" },
  { value: "history", label: "History" },
  { value: "other", label: "Other" },
];

const ANSWER_MODES = [
  {
    value: "true_false" as const,
    label: "True or false",
    description: "Teams bid on whether a statement is correct.",
  },
  {
    value: "sentence" as const,
    label: "Write the sentence",
    description: "Teams bid and write the correct sentence themselves.",
  },
];

export default function NewSetForm() {
  const router = useRouter();
  const supabase = createClient();
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("english_grammar");
  const [level, setLevel] = useState("");
  const [answerMode, setAnswerMode] = useState<"true_false" | "sentence">("true_false");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);

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
      .insert({ title, subject, level: level || null, answer_mode: answerMode, owner_id: user.id })
      .select()
      .single();

    if (error) {
      setLoading(false);
      if (error.message.includes("FREE_PLAN_SET_LIMIT")) {
        setShowUpgrade(true);
      } else {
        setError(error.message);
      }
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
        <div className="flex flex-col gap-2 text-sm font-medium">
          How do teams answer?
          <div className="flex flex-col gap-2 sm:flex-row">
            {ANSWER_MODES.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setAnswerMode(m.value)}
                className={`flex-1 rounded-[var(--radius-control)] border px-3 py-2 text-left text-sm ${
                  answerMode === m.value ? "border-teal-deep bg-teal-deep/5" : "border-border"
                }`}
              >
                <div className="font-semibold">{m.label}</div>
                <div className="font-normal text-xs text-ink-muted">{m.description}</div>
              </button>
            ))}
          </div>
        </div>

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

      {showUpgrade && (
        <UpgradeModal
          title="You've saved 3 of 3 free sets"
          message="Upgrade to Pro for unlimited saved sets, or delete one of your existing sets to make room."
          onClose={() => setShowUpgrade(false)}
        />
      )}
    </div>
  );
}
