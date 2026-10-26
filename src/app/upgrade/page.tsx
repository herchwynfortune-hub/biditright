import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import UpgradeClient from "./UpgradeClient";

export default async function UpgradePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: teacher } = await supabase
    .from("teachers")
    .select("plan, subscription_status, current_period_ends_at")
    .eq("id", user.id)
    .single();

  return (
    <UpgradeClient
      teacherId={user.id}
      email={user.email ?? ""}
      plan={(teacher?.plan ?? "free") as "free" | "pro"}
      subscriptionStatus={teacher?.subscription_status ?? null}
      currentPeriodEndsAt={teacher?.current_period_ends_at ?? null}
    />
  );
}
