import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LibraryHeader from "@/components/LibraryHeader";
import LibraryTabs from "@/components/LibraryTabs";
import PremadeSetsGrid from "@/components/PremadeSetsGrid";
import type { PremadeSetSummary } from "@/lib/game/types";

export default async function LibraryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: teacher } = await supabase.from("teachers").select("*").eq("id", user.id).single();
  const { data: premadeSets } = (await supabase.rpc("list_premade_sets")) as { data: PremadeSetSummary[] | null };

  const isPro = teacher?.plan === "pro";

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <LibraryHeader name={teacher?.name ?? user.email ?? ""} isPro={isPro} />
      <LibraryTabs active="premade" />

      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Premade sets</h1>
        {!isPro && <span className="text-sm text-ink-muted">Starter sets free · full library on Pro</span>}
      </div>

      <PremadeSetsGrid sets={premadeSets ?? []} isPro={isPro} />
    </div>
  );
}
