"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Player } from "@/lib/game/types";

export default function HomeworkStartPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  const supabase = createClient();
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error } = await supabase.rpc("start_homework", { p_code: code, p_nickname: nickname });

    if (error) {
      setError("Couldn't start — check the link and try again.");
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
          <span className="font-display text-lg font-bold">bid it right</span>
        </div>
        <p className="mb-6 text-sm text-ink-muted">Homework practice — play solo at your own pace.</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Your name
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
            {loading ? "Starting…" : "Start practice"}
          </button>
        </form>
      </div>
    </div>
  );
}
