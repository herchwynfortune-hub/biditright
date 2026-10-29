import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import NewSetForm from "./NewSetForm";

export default async function NewSetPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: teacher } = await supabase.from("teachers").select("plan").eq("id", user.id).single();
  const { count } = await supabase
    .from("sets")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", user.id)
    .eq("is_premade", false);

  const atLimit = teacher?.plan !== "pro" && (count ?? 0) >= 3;

  if (atLimit) {
    return (
      <div className="mx-auto w-full max-w-lg flex-1 px-6 py-10">
        <div className="card p-8 text-center">
          <span className="mb-3 inline-block rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
            Pro
          </span>
          <h1 className="mb-2 text-xl font-bold">You&apos;ve saved 3 of 3 free sets</h1>
          <p className="mb-6 text-sm text-ink-muted">
            Upgrade to Pro for unlimited saved sets, or delete one of your existing sets to make room.
          </p>
          <div className="flex flex-col gap-2">
            <Link href="/upgrade" className="btn btn-primary py-2.5 text-center text-sm">
              Upgrade to Pro — $9.99/mo or $89.99/yr
            </Link>
            <Link href="/library/my-sets" className="btn btn-secondary py-2.5 text-sm">
              Back to my sets
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <NewSetForm />;
}
