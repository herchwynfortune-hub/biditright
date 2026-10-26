import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import GeneratorForm from "./GeneratorForm";

export default async function GenerateSetPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: teacher } = await supabase
    .from("teachers")
    .select("plan, ai_generations_used")
    .eq("id", user.id)
    .single();

  const plan = teacher?.plan ?? "free";
  const used = teacher?.ai_generations_used ?? 0;
  const atLimit = plan !== "pro" && used >= 2;

  if (atLimit) {
    return (
      <div className="mx-auto w-full max-w-lg flex-1 px-6 py-10">
        <div className="card p-8 text-center">
          <span className="mb-3 inline-block rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
            Pro
          </span>
          <h1 className="mb-2 text-xl font-bold">You&apos;ve used both free AI generations</h1>
          <p className="mb-6 text-sm text-ink-muted">
            Upgrade to Pro for unlimited AI set generations (fair-use cap), or build a set by hand instead.
          </p>
          <div className="flex flex-col gap-2">
            <Link href="/upgrade" className="btn btn-primary py-2.5 text-center text-sm">
              Upgrade to Pro — $9.99/mo or $89.99/yr
            </Link>
            <Link href="/sets/new" className="btn btn-secondary py-2.5 text-sm">
              Build a set by hand instead
            </Link>
            <Link href="/library" className="text-center text-xs text-ink-muted hover:text-ink">
              Back to my sets
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <GeneratorForm plan={plan as "free" | "pro"} generationsUsed={used} />;
}
