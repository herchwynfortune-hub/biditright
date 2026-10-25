import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import SetEditor from "./SetEditor";

export default async function SetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: set } = await supabase.from("sets").select("*").eq("id", id).single();
  if (!set) notFound();

  const { data: statements } = await supabase
    .from("statements")
    .select("*")
    .eq("set_id", id)
    .order("position");

  const isOwner = set.owner_id === user.id;

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/library" className="text-sm font-semibold text-ink-muted hover:text-ink">
          ← My sets
        </Link>
      </div>

      <SetEditor set={set} initialStatements={statements ?? []} isOwner={isOwner} />
    </div>
  );
}
