import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import SetEditor from "./SetEditor";
import type { SetSummary } from "@/lib/game/types";

export default async function SetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: set } = await supabase.from("sets").select("*").eq("id", id).single();

  if (!set) {
    // Either the set truly doesn't exist, or RLS hid it because it's a
    // Pro-only premade set this teacher can't read. get_set_summary() is
    // safe to call either way — it returns metadata only, no statements.
    const { data: summary } = (await supabase.rpc("get_set_summary", { p_set_id: id }).maybeSingle()) as {
      data: SetSummary | null;
    };
    if (!summary) notFound();

    return (
      <div className="mx-auto w-full max-w-lg flex-1 px-6 py-10">
        <div className="card p-8 text-center">
          <span className="mb-3 inline-block rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
            Pro
          </span>
          <h1 className="mb-2 text-xl font-bold">{summary.title}</h1>
          <p className="mb-6 text-sm text-ink-muted">
            This set is part of the full Pro premade library. Upgrade to Pro to play it with your class.
          </p>
          <div className="flex flex-col gap-2">
            <Link href="/upgrade" className="btn btn-primary py-2.5 text-center text-sm">
              Upgrade to Pro — $9.99/mo or $89.99/yr
            </Link>
            <Link href="/library" className="btn btn-secondary py-2.5 text-sm">
              Back to my sets
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { data: statements } = await supabase
    .from("statements")
    .select("*")
    .eq("set_id", id)
    .order("position");

  const { data: teacher } = await supabase.from("teachers").select("plan").eq("id", user.id).single();
  const { data: homeworkLink } = await supabase
    .from("homework_links")
    .select("code")
    .eq("set_id", id)
    .eq("teacher_id", user.id)
    .maybeSingle();

  const isOwner = set.owner_id === user.id;

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/library" className="text-sm font-semibold text-ink-muted hover:text-ink">
          ← My sets
        </Link>
      </div>

      <SetEditor
        set={set}
        initialStatements={statements ?? []}
        isOwner={isOwner}
        teacherPlan={(teacher?.plan ?? "free") as "free" | "pro"}
        initialHomeworkCode={homeworkLink?.code ?? null}
      />
    </div>
  );
}
