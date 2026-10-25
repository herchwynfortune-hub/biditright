"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Player } from "@/lib/game/types";

export default function JoinPage() {
  const router = useRouter();
  const supabase = createClient();
  const [code, setCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const cleanCode = code.replace(/\s/g, "");
    const { data, error } = await supabase.rpc("join_game", {
      p_join_code: cleanCode,
      p_nickname: nickname,
    });

    if (error) {
      setError("Couldn't join — check the code and try again.");
      setLoading(false);
      return;
    }

    const player = data as Player;
    localStorage.setItem(
      `bir_player_${player.game_id}`,
      JSON.stringify({ playerToken: player.player_token, playerId: player.id })
    );
    router.push(`/play/${player.game_id}`);
  }

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="card w-full max-w-sm p-8">
        <div className="mb-8 flex items-center gap-2">
          <span className="h-7 w-7 rounded-full bg-gold border-2 border-ink" />
          <span className="text-lg font-bold">bid it right</span>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Game code
            <input
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="482 913"
              className="rounded-[var(--radius-control)] border border-border px-3 py-3 text-center font-mono text-2xl tracking-widest outline-none focus:border-teal-deep"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Nickname
            <input
              required
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Your name"
              className="rounded-[var(--radius-control)] border border-border px-3 py-2 text-base outline-none focus:border-teal-deep"
            />
          </label>

          {error && <p className="text-sm text-incorrect">{error}</p>}

          <button type="submit" disabled={loading} className="btn btn-primary mt-2 py-3 text-base disabled:opacity-60">
            {loading ? "Joining…" : "Join game"}
          </button>
        </form>
      </div>
    </div>
  );
}
