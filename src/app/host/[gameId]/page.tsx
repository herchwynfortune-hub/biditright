import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import HostGame from "./HostGame";

export default async function HostPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: game } = await supabase.from("games").select("*").eq("id", gameId).single();
  if (!game) notFound();
  if (game.host_id !== user.id) redirect("/library");

  const { data: set } = await supabase.from("sets").select("*").eq("id", game.set_id).single();
  const { data: statements } = await supabase
    .from("statements")
    .select("*")
    .eq("set_id", game.set_id)
    .order("position");
  const { data: teams } = await supabase.from("teams").select("*").eq("game_id", gameId);
  const { data: players } = await supabase.from("players").select("*").eq("game_id", gameId);
  const { data: teacher } = await supabase.from("teachers").select("plan").eq("id", user.id).single();

  return (
    <HostGame
      initialGame={game}
      set={set!}
      statements={statements ?? []}
      initialTeams={teams ?? []}
      initialPlayers={players ?? []}
      teacherPlan={teacher?.plan ?? "free"}
    />
  );
}
