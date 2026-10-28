"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import UpgradeModal from "@/components/UpgradeModal";
import type { GameSet, Statement } from "@/lib/game/types";

const ERROR_TAGS = ["tense", "article", "agreement", "form", "fact", "other"];

export default function SetEditor({
  set,
  initialStatements,
  isOwner,
  teacherPlan,
  initialHomeworkCode,
}: {
  set: GameSet;
  initialStatements: Statement[];
  isOwner: boolean;
  teacherPlan: "free" | "pro";
  initialHomeworkCode: string | null;
}) {
  const supabase = createClient();
  const router = useRouter();
  const isSentenceMode = set.answer_mode === "sentence";
  const [statements, setStatements] = useState<Statement[]>(initialStatements);
  const [hosting, startHosting] = useTransition();
  const [hostError, setHostError] = useState<string | null>(null);
  const [cloning, startCloning] = useTransition();
  const [showUpgrade, setShowUpgrade] = useState<string | null>(null);

  function update(id: string, patch: Partial<Statement>) {
    setStatements((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  async function persist(statement: Statement) {
    await supabase
      .from("statements")
      .update({
        text: statement.text,
        is_correct: statement.is_correct,
        correction: isSentenceMode ? statement.correction : statement.is_correct ? null : statement.correction,
        explanation: statement.explanation,
        error_tag: statement.error_tag,
      })
      .eq("id", statement.id);
  }

  async function addStatement() {
    const nextPosition = (statements.at(-1)?.position ?? 0) + 1;
    const { data, error } = await supabase
      .from("statements")
      .insert({
        set_id: set.id,
        position: nextPosition,
        text: "",
        is_correct: true,
      })
      .select()
      .single();
    if (!error && data) setStatements((prev) => [...prev, data]);
  }

  async function removeStatement(id: string) {
    setStatements((prev) => prev.filter((s) => s.id !== id));
    await supabase.from("statements").delete().eq("id", id);
  }

  async function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= statements.length) return;
    const next = [...statements];
    [next[index], next[target]] = [next[target], next[index]];
    const a = { ...next[index], position: index + 1 };
    const b = { ...next[target], position: target + 1 };
    next[index] = a;
    next[target] = b;
    setStatements(next);
    await supabase.from("statements").update({ position: a.position }).eq("id", a.id);
    await supabase.from("statements").update({ position: b.position }).eq("id", b.id);
  }

  function hostSet() {
    setHostError(null);
    startHosting(async () => {
      const { data, error } = await supabase.rpc("create_game", {
        p_set_id: set.id,
        p_mode: "devices",
      });
      if (error) {
        setHostError(error.message);
        return;
      }
      router.push(`/host/${data.id}`);
    });
  }

  function cloneSet() {
    startCloning(async () => {
      const { data, error } = await supabase.rpc("clone_set", { p_set_id: set.id });
      if (error) {
        if (error.message.includes("FREE_PLAN_CLONE_LIMIT")) {
          setShowUpgrade("clone");
        } else {
          setHostError(error.message);
        }
        return;
      }
      router.push(`/sets/${data.id}`);
    });
  }

  const [exporting, setExporting] = useState(false);

  async function exportPdf() {
    if (teacherPlan !== "pro") {
      setShowUpgrade("pdf");
      return;
    }
    setExporting(true);
    const { exportSetToPdf } = await import("@/lib/game/pdf");
    exportSetToPdf(set, statements);
    setExporting(false);
  }

  const correctCount = statements.filter((s) => s.is_correct).length;
  const canHost = statements.length >= 8 && statements.length <= 15;

  return (
    <div className="flex flex-col gap-6">
      <div className="card flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <h1 className="text-2xl font-bold">{set.title}</h1>
          <p className="text-sm text-ink-muted">
            {set.level ? `${set.level} · ` : ""}
            {statements.length} statements
            {!isSentenceMode && ` · ${correctCount} correct · ${statements.length - correctCount} wrong`}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex gap-2">
            {!isOwner && (
              <button onClick={cloneSet} disabled={cloning} className="btn btn-secondary px-5 py-2.5 disabled:opacity-50">
                {cloning ? "Duplicating…" : "✨ Duplicate & customize"}
              </button>
            )}
            <button onClick={exportPdf} disabled={exporting} className="btn btn-secondary px-5 py-2.5 disabled:opacity-50">
              {exporting ? "Exporting…" : "📄 Export to PDF"}
            </button>
            <button onClick={hostSet} disabled={hosting || !canHost} className="btn btn-primary px-5 py-2.5 disabled:opacity-50">
              {hosting ? "Starting…" : "Host this set"}
            </button>
          </div>
          {!canHost && <span className="text-xs text-ink-muted">Needs 8–15 statements</span>}
          {hostError && <span className="text-xs text-incorrect">{hostError}</span>}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {statements.map((s, i) => (
          <div key={s.id} className="card flex flex-col gap-3 p-5">
            <div className="flex items-start gap-3">
              <div className="flex flex-col gap-1 pt-1">
                <button
                  disabled={!isOwner}
                  onClick={() => move(i, -1)}
                  className="text-ink-muted hover:text-ink disabled:opacity-30"
                  aria-label="Move up"
                >
                  ▲
                </button>
                <button
                  disabled={!isOwner}
                  onClick={() => move(i, 1)}
                  className="text-ink-muted hover:text-ink disabled:opacity-30"
                  aria-label="Move down"
                >
                  ▼
                </button>
              </div>

              <textarea
                disabled={!isOwner}
                value={s.text}
                onChange={(e) => update(s.id, { text: e.target.value })}
                onBlur={() => persist(statements.find((x) => x.id === s.id)!)}
                placeholder={isSentenceMode ? `Prompt ${i + 1} (e.g. "She ___ to school every day.")` : `Statement ${i + 1}`}
                rows={2}
                className="flex-1 resize-none rounded-[var(--radius-control)] border border-border px-3 py-2 text-base outline-none focus:border-teal-deep disabled:bg-bg"
              />

              {!isSentenceMode && (
                <div className="flex shrink-0 overflow-hidden rounded-[var(--radius-control)] border border-border text-xs font-semibold">
                  <button
                    disabled={!isOwner}
                    onClick={() => {
                      update(s.id, { is_correct: true });
                      persist({ ...s, is_correct: true });
                    }}
                    className={`px-3 py-2 ${s.is_correct ? "bg-correct text-white" : "bg-card text-ink-muted"}`}
                  >
                    Correct
                  </button>
                  <button
                    disabled={!isOwner}
                    onClick={() => {
                      update(s.id, { is_correct: false });
                      persist({ ...s, is_correct: false });
                    }}
                    className={`px-3 py-2 ${!s.is_correct ? "bg-incorrect text-white" : "bg-card text-ink-muted"}`}
                  >
                    Wrong
                  </button>
                </div>
              )}

              {isOwner && (
                <button
                  onClick={() => removeStatement(s.id)}
                  className="shrink-0 text-ink-muted hover:text-incorrect"
                  aria-label="Delete statement"
                >
                  ✕
                </button>
              )}
            </div>

            {(isSentenceMode || !s.is_correct) && (
              <div className="ml-7 flex flex-col gap-2 sm:flex-row">
                <input
                  disabled={!isOwner}
                  value={s.correction ?? ""}
                  onChange={(e) => update(s.id, { correction: e.target.value })}
                  onBlur={() => persist(statements.find((x) => x.id === s.id)!)}
                  placeholder={isSentenceMode ? "Correct sentence" : "Correction"}
                  className="flex-1 rounded-[var(--radius-control)] border border-border px-3 py-2 text-sm outline-none focus:border-teal-deep disabled:bg-bg"
                />
                <select
                  disabled={!isOwner}
                  value={s.error_tag ?? ""}
                  onChange={(e) => {
                    update(s.id, { error_tag: e.target.value });
                    persist({ ...s, error_tag: e.target.value });
                  }}
                  className="rounded-[var(--radius-control)] border border-border px-3 py-2 text-sm outline-none focus:border-teal-deep disabled:bg-bg"
                >
                  <option value="">Error type</option>
                  {ERROR_TAGS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {isOwner && (
              <input
                value={s.explanation ?? ""}
                onChange={(e) => update(s.id, { explanation: e.target.value })}
                onBlur={() => persist(statements.find((x) => x.id === s.id)!)}
                placeholder="Explanation (optional)"
                className="ml-7 rounded-[var(--radius-control)] border border-border px-3 py-2 text-sm outline-none focus:border-teal-deep"
              />
            )}
          </div>
        ))}
      </div>

      {isOwner && (
        <button onClick={addStatement} className="btn btn-secondary self-start px-5 py-2.5">
          + Add statement
        </button>
      )}

      {canHost && (
        <HomeworkCard
          setId={set.id}
          teacherPlan={teacherPlan}
          initialCode={initialHomeworkCode}
          onNeedsUpgrade={() => setShowUpgrade("homework")}
        />
      )}

      {showUpgrade === "clone" && (
        <UpgradeModal
          title="Duplicate & customize is a Pro feature"
          message="Upgrade to Pro to duplicate any premade set into your own library and edit it freely."
          onClose={() => setShowUpgrade(null)}
        />
      )}
      {showUpgrade === "homework" && (
        <UpgradeModal
          title="Homework mode is a Pro feature"
          message="Upgrade to Pro to send students a link to practice this set solo — their results feed straight into your error reports."
          onClose={() => setShowUpgrade(null)}
        />
      )}
      {showUpgrade === "pdf" && (
        <UpgradeModal
          title="PDF export is a Pro feature"
          message="Upgrade to Pro to export this set as a printable worksheet with an answer key."
          onClose={() => setShowUpgrade(null)}
        />
      )}
    </div>
  );
}

type HomeworkAttempt = { gameId: string; nickname: string; balance: number; endedAt: string };

function HomeworkCard({
  setId,
  teacherPlan,
  initialCode,
  onNeedsUpgrade,
}: {
  setId: string;
  teacherPlan: "free" | "pro";
  initialCode: string | null;
  onNeedsUpgrade: () => void;
}) {
  const supabase = createClient();
  const [code, setCode] = useState(initialCode);
  const [creating, setCreating] = useState(false);
  const [attempts, setAttempts] = useState<HomeworkAttempt[] | null>(null);
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  useEffect(() => {
    if (!code) return;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("games")
        .select("id, ended_at, teams(name, balance), players(nickname)")
        .eq("set_id", setId)
        .eq("host_id", user.id)
        .eq("mode", "homework")
        .eq("status", "ended")
        .order("ended_at", { ascending: false });

      setAttempts(
        (data ?? []).map((g) => ({
          gameId: g.id,
          nickname: (g.players as unknown as { nickname: string }[])?.[0]?.nickname ?? "Student",
          balance: (g.teams as unknown as { balance: number }[])?.[0]?.balance ?? 0,
          endedAt: g.ended_at as string,
        }))
      );
    })();
  }, [code, setId, supabase]);

  async function getLink() {
    if (teacherPlan !== "pro") {
      onNeedsUpgrade();
      return;
    }
    setCreating(true);
    const { data, error } = await supabase.rpc("create_homework_link", { p_set_id: setId });
    setCreating(false);
    if (!error && data) setCode(data.code);
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between">
        <div>
          <span className="mb-1 inline-block rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
            Pro
          </span>
          <h2 className="text-lg font-bold">Homework</h2>
          <p className="text-sm text-ink-muted">Share a link so a student can practice this set solo.</p>
        </div>
        {!code && (
          <button onClick={getLink} disabled={creating} className="btn btn-secondary px-4 py-2 text-sm disabled:opacity-50">
            {creating ? "Creating…" : "Get homework link"}
          </button>
        )}
      </div>

      {code && (
        <div className="mt-4 flex flex-col gap-4 border-t border-border pt-4">
          <input
            readOnly
            value={`${origin}/homework/${code}`}
            onFocus={(e) => e.target.select()}
            className="rounded-[var(--radius-control)] border border-border px-3 py-2 text-sm text-ink-muted outline-none focus:border-teal-deep"
          />

          {attempts && attempts.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Past attempts</p>
              {attempts.map((a) => (
                <a
                  key={a.gameId}
                  href={`/host/${a.gameId}`}
                  className="flex items-center justify-between rounded-[var(--radius-control)] border border-border px-3 py-2 text-sm hover:border-teal-deep"
                >
                  <span className="font-semibold">{a.nickname}</span>
                  <span className="text-ink-muted">{a.balance.toLocaleString()} coins</span>
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
