import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/SignOutButton";
import type { PremadeSetSummary } from "@/lib/game/types";

export default async function LibraryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: teacher } = await supabase.from("teachers").select("*").eq("id", user.id).single();

  const { data: mySets } = await supabase
    .from("sets")
    .select("id, title, subject, level, created_at, statements(count)")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  const { data: premadeSets } = (await supabase.rpc("list_premade_sets")) as { data: PremadeSetSummary[] | null };

  const savedCount = mySets?.length ?? 0;
  const savedLimit = teacher?.plan === "pro" ? Infinity : 3;
  const isPro = teacher?.plan === "pro";

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="h-7 w-7 rounded-full bg-gold border-2 border-ink" />
          <span className="text-lg font-bold">bid it right</span>
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-ink-muted">{teacher?.name ?? user.email}</span>
          <SignOutButton />
        </div>
      </header>

      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold">My sets</h1>
        <span className="text-sm text-ink-muted">
          {savedLimit === Infinity ? `${savedCount} saved sets` : `${savedCount} of ${savedLimit} free saved sets`}
        </span>
      </div>

      <section className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {mySets?.map((set) => (
          <Link key={set.id} href={`/sets/${set.id}`} className="card flex flex-col gap-2 p-5 transition-shadow hover:shadow-md">
            <h3 className="font-bold">{set.title}</h3>
            <p className="text-sm text-ink-muted">
              {set.level ? `${set.level} · ` : ""}
              {(set.statements as unknown as { count: number }[])?.[0]?.count ?? 0} statements
            </p>
          </Link>
        ))}

        {savedCount < savedLimit ? (
          <Link
            href="/sets/new"
            className="card flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border p-5 text-center text-ink-muted hover:border-teal-deep hover:text-teal-deep"
          >
            <span className="text-2xl">+</span>
            <span className="text-sm font-semibold">New set by hand</span>
          </Link>
        ) : (
          <div className="card flex flex-col items-center justify-center gap-2 p-5 text-center">
            <span className="rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">Pro</span>
            <p className="text-sm font-semibold">Saved 3 of 3 free sets</p>
            <p className="text-xs text-ink-muted">Upgrade to Pro for unlimited saved sets.</p>
          </div>
        )}

        <div className="card flex flex-col items-center justify-center gap-2 p-5 text-center text-ink-muted">
          <span className="text-sm font-semibold">✨ Make a set with AI</span>
          <span className="text-xs">Coming soon</span>
        </div>
      </section>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold">Premade sets</h2>
        {!isPro && <span className="text-sm text-ink-muted">Starter sets free · full library on Pro</span>}
      </div>
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {premadeSets?.map((set) => {
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
    </div>
  );
}
