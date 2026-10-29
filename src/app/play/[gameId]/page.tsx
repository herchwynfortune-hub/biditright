"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useGameChannel } from "@/lib/game/useGameChannel";
import {
  BID_PRESETS,
  type AnswerMode,
  type Game,
  type Player,
  type RevealResult,
  type Statement,
  type Team,
} from "@/lib/game/types";

export default function PlayPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);
  const router = useRouter();
  const supabase = createClient();

  const [player, setPlayer] = useState<Player | null>(null);
  const [game, setGame] = useState<Game | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [statements, setStatements] = useState<Statement[]>([]);
  const [revealResult, setRevealResult] = useState<RevealResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(`bir_player_${gameId}`);
    if (!stored) {
      router.replace("/join");
      return;
    }
    const { playerToken } = JSON.parse(stored);

    (async () => {
      const { data: playerRow, error: rejoinError } = await supabase.rpc("rejoin_game", {
        p_player_token: playerToken,
      });
      if (rejoinError || !playerRow) {
        setError("Couldn't find your seat in this game.");
        setLoading(false);
        return;
      }
      setPlayer(playerRow);

      const { data: gameRow } = await supabase.from("games").select("*").eq("id", gameId).single();
      const { data: teamRows } = await supabase.from("teams").select("*").eq("game_id", gameId);
      setGame(gameRow);
      setTeams(teamRows ?? []);

      if (gameRow && gameRow.status !== "lobby") {
        const { data: statementRows } = await supabase
          .from("statements")
          .select("*")
          .eq("set_id", gameRow.set_id)
          .order("position");
        setStatements(statementRows ?? []);
      }

      setLoading(false);
    })();
  }, [gameId, router, supabase]);

  useGameChannel(gameId, {
    onRevealed: (payload) => setRevealResult(payload),
    onAdvanced: async () => {
      setRevealResult(null);
      const { data: gameRow } = await supabase.from("games").select("*").eq("id", gameId).single();
      setGame(gameRow);
    },
  });

  useEffect(() => {
    if (!game) return;
    const channel = supabase
      .channel(`db:play:${gameId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "games", filter: `id=eq.${gameId}` }, (p) =>
        setGame(p.new as Game)
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "teams", filter: `game_id=eq.${gameId}` }, (p) => {
        const next = p.new as Team;
        setTeams((prev) => (prev.some((t) => t.id === next.id) ? prev.map((t) => (t.id === next.id ? next : t)) : [...prev, next]));
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, !!game]);

  useEffect(() => {
    if (!game || game.status === "lobby" || statements.length) return;
    supabase
      .from("statements")
      .select("*")
      .eq("set_id", game.set_id)
      .order("position")
      .then(({ data }) => setStatements(data ?? []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.status]);

  if (loading) return <div className="flex flex-1 items-center justify-center text-ink-muted">Loading…</div>;
  if (error || !player || !game) return <div className="flex flex-1 items-center justify-center text-incorrect">{error ?? "Something went wrong."}</div>;

  const myTeam = teams.find((t) => t.id === player.team_id);
  const currentStatement = statements[game.current_statement_index];

  if (game.status === "lobby") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <span className="h-10 w-10 rounded-full bg-gold border-2 border-ink" />
        <p className="text-lg font-bold">You&apos;re in, {player.nickname}!</p>
        {myTeam && (
          <p className="rounded-full px-4 py-1 text-sm font-bold text-white" style={{ background: myTeam.color }}>
            {myTeam.name}
          </p>
        )}
        <p className="text-sm text-ink-muted">Waiting for the teacher to start the game…</p>
      </div>
    );
  }

  if (game.status === "ended") {
    const ranked = [...teams].sort((a, b) => b.balance - a.balance);
    const isHomework = game.mode === "homework";
    return (
      <div className="flex flex-1 flex-col items-center gap-4 px-6 py-12 text-center">
        <h1 className="text-2xl font-bold">{isHomework ? "Nice work!" : "Game over"}</h1>
        <p className="text-lg font-bold text-teal-deep">
          {isHomework ? `Final balance: ${ranked[0]?.balance.toLocaleString()} coins` : `${ranked[0]?.name} wins!`}
        </p>
        {!isHomework && (
          <div className="flex w-full max-w-xs flex-col gap-2">
            {ranked.map((t, i) => (
              <div key={t.id} className="flex items-center justify-between rounded-[var(--radius-control)] px-4 py-2 text-white" style={{ background: t.color }}>
                <span>
                  #{i + 1} {t.name}
                </span>
                <span className="font-bold">{t.balance.toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (revealResult) {
    const myBid = revealResult.bids.find((b) => b.team_id === player.team_id);
    const delta = myBid ? (myBid.correct ? myBid.amount : -myBid.amount) * revealResult.multiplier : 0;
    const isSentenceMode = revealResult.answer_mode === "sentence";
    return (
      <div className="flex flex-1 flex-col items-center gap-4 px-6 py-12 text-center">
        {myBid && (
          <span className={`rounded-full px-4 py-1 text-sm font-bold text-white ${myBid.correct ? "bg-correct" : "bg-incorrect"}`}>
            {myBid.correct ? "Your team got it right" : "Your team got it wrong"}
          </span>
        )}
        {revealResult.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={revealResult.image_url} alt="" className="max-h-48 rounded-[var(--radius-card)] object-contain" />
        )}
        <p className="text-2xl font-bold">{revealResult.text}</p>
        {isSentenceMode && revealResult.correction && <p className="font-semibold text-teal-deep">{revealResult.correction}</p>}
        {!isSentenceMode && !revealResult.is_correct && revealResult.correction && (
          <p className="font-semibold text-teal-deep">{revealResult.correction}</p>
        )}
        {revealResult.explanation && <p className="max-w-sm text-sm text-ink-muted">{revealResult.explanation}</p>}
        {myBid && (
          <p className={`text-lg font-bold ${delta >= 0 ? "text-correct" : "text-incorrect"}`}>
            {delta >= 0 ? "+" : ""}
            {delta} coins
          </p>
        )}
        {game.mode === "homework" ? (
          <ContinueButton gameId={gameId} onAdvanced={() => setRevealResult(null)} />
        ) : (
          <p className="text-sm text-ink-muted">Waiting for the teacher to continue…</p>
        )}
      </div>
    );
  }

  if (!currentStatement || !myTeam) {
    return <div className="flex flex-1 items-center justify-center text-ink-muted">Waiting…</div>;
  }

  return (
    <BidScreen
      key={currentStatement.id}
      gameId={gameId}
      player={player}
      team={myTeam}
      statement={currentStatement}
      statementNumber={game.current_statement_index + 1}
      total={statements.length}
      answerMode={game.answer_mode}
      isHomework={game.mode === "homework"}
      onRevealed={setRevealResult}
    />
  );
}

function ContinueButton({ gameId, onAdvanced }: { gameId: string; onAdvanced: () => void }) {
  const supabase = createClient();
  const [advancing, setAdvancing] = useState(false);

  async function advance() {
    setAdvancing(true);
    const stored = localStorage.getItem(`bir_player_${gameId}`);
    const playerToken = stored ? JSON.parse(stored).playerToken : null;
    await supabase.rpc("advance_homework_game", { p_game_id: gameId, p_player_token: playerToken });
    onAdvanced();
  }

  return (
    <button onClick={advance} disabled={advancing} className="btn btn-primary px-8 py-3 text-base disabled:opacity-60">
      {advancing ? "Loading…" : "Continue"}
    </button>
  );
}

function BidScreen({
  gameId,
  player,
  team,
  statement,
  statementNumber,
  total,
  answerMode,
  isHomework,
  onRevealed,
}: {
  gameId: string;
  player: Player;
  team: Team;
  statement: Statement;
  statementNumber: number;
  total: number;
  answerMode: AnswerMode;
  isHomework: boolean;
  onRevealed: (result: RevealResult) => void;
}) {
  const supabase = createClient();
  const [amount, setAmount] = useState(0);
  const [tfAnswer, setTfAnswer] = useState<"true" | "false" | null>(null);
  const [sentenceAnswer, setSentenceAnswer] = useState("");
  const [locked, setLocked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const stored = typeof window !== "undefined" ? localStorage.getItem(`bir_player_${gameId}`) : null;
  const playerToken = stored ? JSON.parse(stored).playerToken : null;

  if (!player.is_captain) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center" style={{ background: team.color }}>
        <p className="text-sm font-semibold text-white/80">
          {team.name} · {team.balance.toLocaleString()} coins
        </p>
        {statement.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={statement.image_url} alt="" className="max-h-48 rounded-[var(--radius-card)] border-2 border-white/30 object-contain" />
        )}
        <p className="text-2xl font-bold text-white">{statement.text}</p>
        <p className="text-sm text-white/80">Your captain is placing the bid for your team.</p>
      </div>
    );
  }

  const answer = answerMode === "true_false" ? tfAnswer : sentenceAnswer.trim() || null;
  const canLockIn = answer !== null && answer !== "";

  async function lockIn(finalAmount: number) {
    if (!canLockIn) return;
    setSubmitting(true);
    const { error } = await supabase.rpc("submit_bid", {
      p_game_id: gameId,
      p_statement_id: statement.id,
      p_team_id: team.id,
      p_amount: finalAmount,
      p_answer: answer,
      p_player_token: playerToken,
    });
    if (error) {
      setSubmitting(false);
      return;
    }

    if (isHomework) {
      // No teacher is present to drive a solo session, so reveal immediately.
      const { data } = await supabase.rpc("reveal_homework_statement", {
        p_game_id: gameId,
        p_player_token: playerToken,
      });
      setSubmitting(false);
      if (data) onRevealed(data as RevealResult);
      return;
    }

    setSubmitting(false);
    setLocked(true);
  }

  if (locked) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center" style={{ background: team.color }}>
        <p className="text-lg font-bold text-white">
          {answerMode === "true_false" ? (tfAnswer === "true" ? "True" : "False") : `"${sentenceAnswer.trim()}"`} for{" "}
          {amount.toLocaleString()}
        </p>
        <p className="text-sm text-white/80">Waiting for the other teams…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-5 px-5 py-6">
      <div className="text-sm font-semibold text-ink-muted">
        {team.name} · You&apos;re the captain · {team.balance.toLocaleString()} coins
      </div>
      <div className="card p-5">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">
          Statement {statementNumber} of {total} ·{" "}
          {answerMode === "true_false" ? "Correct or not?" : "Write the correct sentence"}
        </p>
        {statement.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={statement.image_url} alt="" className="mb-2 max-h-48 w-full rounded-[var(--radius-control)] object-contain" />
        )}
        <p className="text-xl font-bold">{statement.text}</p>
      </div>

      {answerMode === "true_false" ? (
        <div className="card flex gap-3 p-5">
          <button
            onClick={() => setTfAnswer("true")}
            className={`flex-1 rounded-[var(--radius-control)] py-3 text-base font-bold ${
              tfAnswer === "true" ? "bg-correct text-white" : "bg-bg text-ink-muted"
            }`}
          >
            True
          </button>
          <button
            onClick={() => setTfAnswer("false")}
            className={`flex-1 rounded-[var(--radius-control)] py-3 text-base font-bold ${
              tfAnswer === "false" ? "bg-incorrect text-white" : "bg-bg text-ink-muted"
            }`}
          >
            False
          </button>
        </div>
      ) : (
        <div className="card flex flex-col gap-2 p-5">
          <p className="text-sm font-semibold">Your answer</p>
          <input
            value={sentenceAnswer}
            onChange={(e) => setSentenceAnswer(e.target.value)}
            placeholder="Type the correct sentence"
            className="rounded-[var(--radius-control)] border border-border px-3 py-2 text-base outline-none focus:border-teal-deep"
          />
        </div>
      )}

      <div className="card flex flex-col gap-3 p-5">
        <p className="text-sm font-semibold">Your bid</p>
        <p className="text-center text-4xl font-bold">{amount.toLocaleString()}</p>
        <input
          type="range"
          min={0}
          max={team.balance}
          step={10}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="w-full"
        />
        <div className="grid grid-cols-4 gap-2">
          {[...BID_PRESETS, team.balance].map((v, i) => (
            <button
              key={i}
              onClick={() => setAmount(Math.min(v, team.balance))}
              className="btn btn-secondary py-2 text-sm"
            >
              {i === BID_PRESETS.length ? "All in" : v}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={() => lockIn(amount)}
        disabled={submitting || !canLockIn}
        className="btn btn-primary py-3 text-base disabled:opacity-60"
      >
        {submitting
          ? "Locking in…"
          : !canLockIn
            ? answerMode === "true_false"
              ? "Pick true or false first"
              : "Write your answer first"
            : `Lock in ${amount.toLocaleString()} coins`}
      </button>
    </div>
  );
}
