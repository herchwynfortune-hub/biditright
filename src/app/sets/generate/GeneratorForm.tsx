"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import UpgradeModal from "@/components/UpgradeModal";
import { SUBJECTS, type GeneratedStatement } from "@/lib/game/generator";

export default function GeneratorForm({ plan, generationsUsed }: { plan: "free" | "pro"; generationsUsed: number }) {
  const router = useRouter();
  const supabase = createClient();

  const [subject, setSubject] = useState("english_grammar");
  const [level, setLevel] = useState("B1");
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(12);
  const [wrongPercent, setWrongPercent] = useState(50);
  const [commonErrors, setCommonErrors] = useState("");

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [usedCount, setUsedCount] = useState(generationsUsed);

  const [draft, setDraft] = useState<GeneratedStatement[] | null>(null);
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);

  const triesLeft = plan === "pro" ? null : Math.max(0, 2 - usedCount);

  async function generate() {
    setGenerating(true);
    setError(null);
    setDraft(null);

    const res = await fetch("/api/generate-set", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, level, topic, count, wrongPercent, commonErrors: commonErrors || undefined }),
    });
    const body = await res.json();
    setGenerating(false);

    if (!res.ok) {
      if (typeof body.error === "string" && body.error.includes("FREE_PLAN_AI_LIMIT")) {
        setShowUpgrade(true);
      } else {
        setError(body.error ?? "Something went wrong. Please try again.");
      }
      return;
    }

    setDraft(body.statements);
    if (typeof body.aiGenerationsUsed === "number") setUsedCount(body.aiGenerationsUsed);
    if (!title) setTitle(topic);
  }

  async function saveSet() {
    if (!draft) return;
    setSaving(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    const { data: set, error: insertError } = await supabase
      .from("sets")
      .insert({ title: title || topic, subject, level, owner_id: user.id })
      .select()
      .single();

    if (insertError) {
      setSaving(false);
      setError(
        insertError.message.includes("FREE_PLAN_SET_LIMIT")
          ? "You've saved 3 of 3 free sets. Upgrade to Pro, or delete a set to make room."
          : insertError.message
      );
      return;
    }

    const { error: statementsError } = await supabase.from("statements").insert(
      draft.map((s, i) => ({
        set_id: set.id,
        position: i + 1,
        text: s.text,
        is_correct: s.is_correct,
        correction: s.correction,
        explanation: s.explanation,
        error_tag: s.error_tag,
      }))
    );

    setSaving(false);
    if (statementsError) {
      setError(statementsError.message);
      return;
    }

    router.push(`/sets/${set.id}`);
  }

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      <h1 className="mb-1 text-2xl font-bold">Make a set with AI</h1>
      <p className="mb-6 text-sm text-ink-muted">
        {plan === "pro" ? "Unlimited generations (fair-use cap)." : `Free plan: ${triesLeft} of 2 trial generations left.`}
      </p>

      <div className="card mb-6 flex flex-col gap-4 p-6">
        <div className="grid grid-cols-2 gap-4">
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
            Level
            <input
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              placeholder="B1, or Grade 6, or Intermediate"
              className="rounded-[var(--radius-control)] border border-border px-3 py-2 text-base font-normal outline-none focus:border-teal-deep"
            />
          </label>
        </div>

        <label className="flex flex-col gap-1 text-sm font-medium">
          Topic or target point
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. present perfect vs past simple, travel"
            className="rounded-[var(--radius-control)] border border-border px-3 py-2 text-base font-normal outline-none focus:border-teal-deep"
          />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Statements: {count}
            <input
              type="range"
              min={8}
              max={15}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Wrong: {wrongPercent}%
            <input
              type="range"
              min={20}
              max={80}
              step={10}
              value={wrongPercent}
              onChange={(e) => setWrongPercent(Number(e.target.value))}
            />
          </label>
        </div>

        <label className="flex flex-col gap-1 text-sm font-medium">
          Common errors to include <span className="font-normal text-ink-muted">(optional)</span>
          <input
            value={commonErrors}
            onChange={(e) => setCommonErrors(e.target.value)}
            placeholder="e.g. missing articles, wrong plural"
            className="rounded-[var(--radius-control)] border border-border px-3 py-2 text-base font-normal outline-none focus:border-teal-deep"
          />
        </label>

        {error && <p className="text-sm text-incorrect">{error}</p>}

        <button
          onClick={generate}
          disabled={generating || !topic.trim() || triesLeft === 0}
          className="btn btn-primary py-3 text-base disabled:opacity-50"
        >
          {generating ? "Generating…" : "Generate set"}
        </button>
      </div>

      {draft && (
        <div className="card flex flex-col gap-4 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">
              Draft to review — {draft.length} · {draft.filter((s) => !s.is_correct).length} wrong
            </h2>
          </div>

          <label className="flex flex-col gap-1 text-sm font-medium">
            Set title
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Name this set"
              className="rounded-[var(--radius-control)] border border-border px-3 py-2 text-base font-normal outline-none focus:border-teal-deep"
            />
          </label>

          <div className="flex flex-col gap-2">
            {draft.map((s, i) => (
              <div key={i} className="border-b border-border pb-3 last:border-0">
                <div className="flex items-start gap-2">
                  <span
                    className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold text-white ${
                      s.is_correct ? "bg-correct" : "bg-incorrect"
                    }`}
                  >
                    {s.is_correct ? "Correct" : "Wrong"}
                  </span>
                  <p className="text-sm font-medium">{s.text}</p>
                </div>
                {!s.is_correct && (
                  <p className="ml-[52px] text-xs text-ink-muted">
                    Fix: {s.correction} · {s.error_tag}
                  </p>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <button onClick={saveSet} disabled={saving || !title.trim()} className="btn btn-primary flex-1 py-2.5 text-sm disabled:opacity-50">
              {saving ? "Saving…" : "Save set"}
            </button>
            <button
              onClick={generate}
              disabled={generating || triesLeft === 0}
              className="btn btn-secondary flex-1 py-2.5 text-sm disabled:opacity-50"
            >
              Regenerate
            </button>
          </div>
        </div>
      )}

      {showUpgrade && (
        <UpgradeModal
          title="You've used both free AI generations"
          message="Upgrade to Pro for unlimited AI set generations (fair-use cap)."
          onClose={() => setShowUpgrade(false)}
        />
      )}
    </div>
  );
}
