"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Game, Player, Team } from "./types";

export function useGameState(gameId: string, initialGame: Game, initialTeams: Team[], initialPlayers: Player[]) {
  const [game, setGame] = useState<Game>(initialGame);
  const [teams, setTeams] = useState<Team[]>(initialTeams);
  const [players, setPlayers] = useState<Player[]>(initialPlayers);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`db:game:${gameId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "games", filter: `id=eq.${gameId}` },
        (payload) => {
          if (payload.eventType !== "DELETE") setGame(payload.new as Game);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "teams", filter: `game_id=eq.${gameId}` },
        (payload) => {
          setTeams((prev) => {
            if (payload.eventType === "DELETE") {
              return prev.filter((t) => t.id !== (payload.old as Team).id);
            }
            const next = payload.new as Team;
            const exists = prev.some((t) => t.id === next.id);
            return exists ? prev.map((t) => (t.id === next.id ? next : t)) : [...prev, next];
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "players", filter: `game_id=eq.${gameId}` },
        (payload) => {
          setPlayers((prev) => {
            if (payload.eventType === "DELETE") {
              return prev.filter((p) => p.id !== (payload.old as Player).id);
            }
            const next = payload.new as Player;
            const exists = prev.some((p) => p.id === next.id);
            return exists ? prev.map((p) => (p.id === next.id ? next : p)) : [...prev, next];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId]);

  return { game, setGame, teams, setTeams, players, setPlayers };
}
