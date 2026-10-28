"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useGameState } from "@/lib/game/useGameState";
import { useGameChannel } from "@/lib/game/useGameChannel";
import UpgradeModal from "@/components/UpgradeModal";
import ThemedScreen from "@/components/ThemedScreen";
import { THEMES, type ThemeId } from "@/lib/game/themes";
import {
  TEAM_COLORS,
  TEAM_NAME_POOL,
  type ErrorReportRow,
  type Game,
  type GameSet,
  type Player,
  type RevealResult,
  type Statement,
  type Team,
} from "@/lib/game/types";

export default function HostGame({
  initialGame,
  set,
  statements,
  initialTeams,
  initialPlayers,
  teacherPlan,
  logoUrl,
}: {
  initialGame: Game;
  set: GameSet;
  statements: Statement[];
  initialTeams: Team[];
  initialPlayers: Player[];
  teacherPlan: "free" | "pro";
  logoUrl: string | null;
}) {
  const { game, teams, players } = useGameState(initialGame.id, initialGame, initialTeams, initialPlayers);

  const currentStatement = statements[game.current_statement_index] ?? null;

  if (game.status === "lobby") {
    return (
      <ThemedScreen theme={game.theme}>
        <LobbyView game={game} set={set} teams={teams} players={players} teacherPlan={teacherPlan} logoUrl={logoUrl} />
      </ThemedScreen>
    );
  }

  if (game.status === "ended") {
    return (
      <ThemedScreen theme={game.theme}>
        <LeaderboardView game={game} set={set} teams={teams} statements={statements} teacherPlan={teacherPlan} />
      </ThemedScreen>
    );
  }

  return (
    <ThemedScreen theme={game.theme}>
      <ActiveHostView
        key={currentStatement?.id ?? game.current_statement_index}
        game={game}
        statements={statements}
        teams={teams}
        currentStatement={currentStatement}
        logoUrl={logoUrl}
      />
    </ThemedScreen>
  );
}

// ---------- Lobby ----------

function LobbyView({
  game,
  set,
  teams,
  players,
  teacherPlan,
  logoUrl,
}: {
  game: Game;
  set: GameSet;
  teams: Team[];
  players: Player[];
  teacherPlan: "free" | "pro";
  logoUrl: string | null;
}) {
  const supabase = createClient();
  const [mode, setMode] = useState(game.mode);
  const [timer, setTimer] = useState(game.timer_seconds);
  const [doubleRound, setDoubleRound] = useState(game.double_round);
  const [theme, setTheme] = useState(game.theme);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUpgrade, setShowUpgrade] = useState<"team" | "theme" | "logo" | null>(null);
  const maxTeams = teacherPlan === "pro" ? 10 : 4;
  const joinHost = typeof window !== "undefined" ? window.location.host : "";

  async function syncSettings(patch: Partial<Pick<Game, "mode" | "timer_seconds" | "double_round" | "theme">>) {
    await supabase.from("games").update(patch).eq("id", game.id);
  }

  async function addTeam() {
    // Name/color are assigned atomically on the server to avoid a race when
    // this is clicked twice quickly (two inserts reading the same local count).
    const { error } = await supabase.rpc("add_team", { p_game_id: game.id });
    if (error?.message.includes("FREE_PLAN_TEAM_LIMIT")) {
      setShowUpgrade("team");
    }
  }

  async function removeTeam(teamId: string) {
    await supabase.rpc("remove_team", { p_team_id: teamId });
  }

  async function shuffleTeams() {
    await Promise.all(
      teams.map((t, i) =>
        supabase
          .from("teams")
          .update({ name: `Team ${TEAM_NAME_POOL[i % TEAM_NAME_POOL.length]}`, color: TEAM_COLORS[i % TEAM_COLORS.length] })
          .eq("id", t.id)
      )
    );
  }

  async function startGame() {
    if (teams.length < 2) {
      setError("Add at least 2 teams before starting.");
      return;
    }
    setStarting(true);
    const { error } = await supabase.rpc("start_game", { p_game_id: game.id });
    setStarting(false);
    if (error) setError(error.message);
  }

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
      <div className="card mb-6 flex items-center justify-between p-5">
        <div className="flex items-center gap-2">
          <BrandMark logoUrl={logoUrl} />
          <span className="font-bold">bid it right</span>
          <span className="text-sm text-ink-muted">
            · Lobby · {set.title} · {teams.length ? `${teams.length} teams` : "no teams yet"}
          </span>
        </div>
        <button onClick={startGame} disabled={starting} className="btn btn-primary px-5 py-2.5 disabled:opacity-50">
          {starting ? "Starting…" : "Start game"}
        </button>
      </div>

      {error && <p className="mb-4 text-sm text-incorrect">{error}</p>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-6">
          <div className="card p-6">
            <h2 className="mb-3 text-lg font-bold">How will students play?</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                onClick={() => {
                  setMode("devices");
                  syncSettings({ mode: "devices" });
                }}
                className={`rounded-[var(--radius-control)] border-2 p-4 text-left ${
                  mode === "devices" ? "border-teal-deep" : "border-border"
                }`}
              >
                <div className="mb-1 font-bold">📱 Join with devices</div>
                <p className="text-sm text-ink-muted">
                  Online classes, or rooms where students have phones. Captains bid on their own screen.
                </p>
              </button>
              <button
                onClick={() => {
                  setMode("one_screen");
                  syncSettings({ mode: "one_screen" });
                }}
                className={`rounded-[var(--radius-control)] border-2 p-4 text-left ${
                  mode === "one_screen" ? "border-teal-deep" : "border-border"
                }`}
              >
                <div className="mb-1 font-bold">💻 One screen, no devices</div>
                <p className="text-sm text-ink-muted">
                  Offline classrooms. Teams hold up their bid on paper; you type it in on the projector.
                </p>
              </button>
            </div>
          </div>

          {mode === "devices" && (
            <div className="rounded-[var(--radius-card)] bg-teal-deep p-6 text-white">
              <p className="mb-1 text-sm opacity-80">Go to {joinHost}/join and enter</p>
              <div className="flex items-end justify-between">
                <div className="font-mono text-5xl font-bold tracking-wider">
                  {game.join_code.slice(0, 3)} {game.join_code.slice(3)}
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gold">{players.length}</div>
                  <div className="text-xs opacity-80">students joined</div>
                </div>
              </div>
            </div>
          )}

          <div className="card flex flex-wrap items-center gap-6 p-6">
            <label className="flex items-center gap-2 text-sm font-medium">
              Bid timer
              <select
                value={timer}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setTimer(v);
                  syncSettings({ timer_seconds: v });
                }}
                className="rounded-[var(--radius-control)] border border-border px-2 py-1"
              >
                {[20, 30, 45, 60].map((s) => (
                  <option key={s} value={s}>
                    {s} seconds
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={doubleRound}
                onChange={(e) => {
                  setDoubleRound(e.target.checked);
                  syncSettings({ double_round: e.target.checked });
                }}
              />
              Double coins on the last statement
            </label>
          </div>

          <ThemePicker
            theme={theme}
            teacherPlan={teacherPlan}
            onSelect={(id) => {
              setTheme(id);
              syncSettings({ theme: id });
            }}
            onNeedsUpgrade={() => setShowUpgrade("theme")}
          />

          <LogoUploader teacherPlan={teacherPlan} initialLogoUrl={logoUrl} onNeedsUpgrade={() => setShowUpgrade("logo")} />
        </div>

        <div className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold">Teams</h2>
            <button onClick={shuffleTeams} className="btn btn-secondary px-3 py-1.5 text-xs">
              Shuffle
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {teams.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-[var(--radius-control)] p-3 text-white" style={{ background: t.color }}>
                <div>
                  <div className="font-bold">{t.name}</div>
                  <div className="text-xs opacity-80">
                    {players.filter((p) => p.team_id === t.id).map((p) => p.nickname).join(" · ") || "No students yet"}
                  </div>
                </div>
                <button onClick={() => removeTeam(t.id)} className="opacity-80 hover:opacity-100" aria-label="Remove team">
                  ✕
                </button>
              </div>
            ))}
            <button
              onClick={() => (teams.length >= maxTeams ? setShowUpgrade("team") : addTeam())}
              className="btn btn-secondary py-2.5 text-sm"
            >
              + Add team
            </button>
          </div>
        </div>
      </div>

      {showUpgrade === "team" && (
        <UpgradeModal
          title={`You've reached ${maxTeams} teams`}
          message="Upgrade to Pro to host games with up to 10 teams."
          onClose={() => setShowUpgrade(null)}
        />
      )}
      {showUpgrade === "theme" && (
        <UpgradeModal
          title="More themes on Pro"
          message="Upgrade to Pro to unlock every theme, plus your own logo on the host screen."
          onClose={() => setShowUpgrade(null)}
        />
      )}
      {showUpgrade === "logo" && (
        <UpgradeModal
          title="Custom logo is a Pro feature"
          message="Upgrade to Pro to show your own logo on the host screen instead of the default mark."
          onClose={() => setShowUpgrade(null)}
        />
      )}
    </div>
  );
}

function ThemePicker({
  theme,
  teacherPlan,
  onSelect,
  onNeedsUpgrade,
}: {
  theme: string;
  teacherPlan: "free" | "pro";
  onSelect: (id: ThemeId) => void;
  onNeedsUpgrade: () => void;
}) {
  return (
    <div className="card p-6">
      <h2 className="mb-3 text-lg font-bold">Theme</h2>
      <div className="grid grid-cols-5 gap-2">
        {THEMES.map((t) => (
          <button
            key={t.id}
            onClick={() => (t.pro && teacherPlan !== "pro" ? onNeedsUpgrade() : onSelect(t.id))}
            className={`flex flex-col items-center gap-1.5 rounded-[var(--radius-control)] border-2 p-2 ${
              theme === t.id ? "border-teal-deep" : "border-border"
            }`}
          >
            <span className="relative flex h-8 w-8 overflow-hidden rounded-full border border-border">
              <span className="h-full w-1/2" style={{ background: t.colors["--color-teal-deep"] }} />
              <span className="h-full w-1/2" style={{ background: t.colors["--color-orange"] }} />
            </span>
            <span className="flex items-center gap-1 text-[11px] font-semibold text-ink-muted">
              {t.label}
              {t.pro && <span className="rounded-full bg-gold px-1 text-[9px] font-bold">PRO</span>}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function BrandMark({ logoUrl }: { logoUrl: string | null }) {
  if (logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={logoUrl} alt="" className="h-6 w-6 rounded-full border border-border object-cover" />;
  }
  return <span className="h-6 w-6 rounded-full bg-gold border-2 border-ink" />;
}

function LogoUploader({
  teacherPlan,
  initialLogoUrl,
  onNeedsUpgrade,
}: {
  teacherPlan: "free" | "pro";
  initialLogoUrl: string | null;
  onNeedsUpgrade: () => void;
}) {
  const supabase = createClient();
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploading(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const ext = file.name.split(".").pop() ?? "png";
    const path = `${user.id}/logo.${ext}`;
    const { error: uploadError } = await supabase.storage.from("logos").upload(path, file, { upsert: true });
    if (uploadError) {
      setUploading(false);
      setError(uploadError.message);
      return;
    }

    const { data: pub } = supabase.storage.from("logos").getPublicUrl(path);
    const url = `${pub.publicUrl}?v=${Date.now()}`;
    const { error: rpcError } = await supabase.rpc("set_logo_url", { p_logo_url: url });
    if (rpcError) {
      setUploading(false);
      setError(rpcError.message);
      return;
    }
    setLogoUrl(url);
    setUploading(false);
  }

  return (
    <div className="card p-6">
      <h2 className="mb-3 text-lg font-bold">Your logo</h2>
      <div className="flex items-center gap-4">
        <BrandMark logoUrl={logoUrl} />
        <label
          className="btn btn-secondary cursor-pointer px-4 py-2 text-sm"
          onClickCapture={(e) => {
            if (teacherPlan !== "pro") {
              e.preventDefault();
              onNeedsUpgrade();
            }
          }}
        >
          {uploading ? "Uploading…" : logoUrl ? "Change logo" : "Upload logo"}
          <input type="file" accept="image/*" className="hidden" onChange={handleFile} disabled={uploading} />
        </label>
      </div>
      {error && <p className="mt-2 text-xs text-incorrect">{error}</p>}
    </div>
  );
}

// ---------- Active (host screen) ----------

function ActiveHostView({
  game,
  statements,
  teams,
  currentStatement,
  logoUrl,
}: {
  game: Game;
  statements: Statement[];
  teams: Team[];
  currentStatement: Statement | null;
  logoUrl: string | null;
}) {
  const supabase = createClient();
  const [secondsLeft, setSecondsLeft] = useState(game.timer_seconds);
  const [fixTeamId, setFixTeamId] = useState<string | null>(null);
  const [fixText, setFixText] = useState("");
  const [resolvedFixTeamIds, setResolvedFixTeamIds] = useState<Set<string>>(new Set());
  const [lockedTeamIds, setLockedTeamIds] = useState<Set<string>>(new Set());
  const [revealResult, setRevealResult] = useState<RevealResult | null>(null);
  const [revealing, setRevealing] = useState(false);

  useGameChannel(game.id, {
    onBidLocked: ({ team_id }) => setLockedTeamIds((prev) => new Set(prev).add(team_id)),
    onRevealed: (payload) => setRevealResult(payload),
  });

  // Catches any bids a client missed before it subscribed (e.g. the teacher
  // reloaded mid-round). This component remounts fresh each statement (keyed
  // by statement id in the parent), so this only ever needs to run once.
  useEffect(() => {
    if (!currentStatement) return;
    supabase
      .from("bid_status")
      .select("team_id")
      .eq("statement_id", currentStatement.id)
      .then(({ data }) => setLockedTeamIds(new Set((data ?? []).map((r) => r.team_id))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStatement?.id]);

  useEffect(() => {
    if (revealResult || game.status !== "active") return;
    const interval = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(interval);
  }, [revealResult, game.status]);

  async function handleReveal() {
    setRevealing(true);
    const { data, error } = await supabase.rpc("reveal_statement", { p_game_id: game.id });
    setRevealing(false);
    if (!error) setRevealResult(data as RevealResult);
  }

  async function handleAdvance() {
    await supabase.rpc("apply_bailouts", { p_game_id: game.id });
    await supabase.rpc("advance_game", { p_game_id: game.id });
  }

  async function resolveFix(teamId: string, accepted: boolean) {
    await supabase.rpc("resolve_fix", {
      p_game_id: game.id,
      p_statement_id: revealResult!.statement_id,
      p_team_id: teamId,
      p_player_id: null,
      p_text: fixText,
      p_accepted: accepted,
    });
    setResolvedFixTeamIds((prev) => new Set(prev).add(teamId));
    setFixTeamId(null);
    setFixText("");
  }

  if (!currentStatement) {
    return <div className="p-10 text-center text-ink-muted">No statements in this set.</div>;
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-6">
      <div className="card flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <BrandMark logoUrl={logoUrl} />
          <span className="font-bold">bid it right</span>
          <span className="text-sm text-ink-muted">
            · Statement {game.current_statement_index + 1} of {statements.length} · Code {game.join_code}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => supabase.rpc("set_game_status", { p_game_id: game.id, p_status: game.status === "paused" ? "active" : "paused" })}
            className="btn btn-secondary px-4 py-2 text-sm"
          >
            {game.status === "paused" ? "Resume" : "Pause"}
          </button>
          <button onClick={handleAdvance} className="btn btn-secondary px-4 py-2 text-sm">
            Skip
          </button>
        </div>
      </div>

      {!revealResult ? (
        <>
          <div className="card flex flex-col items-center gap-4 px-10 py-12 text-center">
            <p className="text-sm font-semibold text-ink-muted">Correct or not? Place your bids.</p>
            <p className="text-[clamp(28px,4vw,48px)] font-bold leading-tight">{currentStatement.text}</p>
            <div className="flex items-center gap-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Bids close in</div>
              <div className="rounded-full bg-bg px-4 py-1 text-2xl font-bold">{secondsLeft}</div>
              <button
                onClick={() => setSecondsLeft((s) => s + 15)}
                className="btn btn-secondary px-3 py-1.5 text-xs"
              >
                +15 seconds
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {teams.map((t) => (
              <TeamBidTile key={t.id} team={t} locked={lockedTeamIds.has(t.id)} mode={game.mode} gameId={game.id} statementId={currentStatement.id} />
            ))}
          </div>

          <button onClick={handleReveal} disabled={revealing} className="btn btn-primary self-center px-8 py-3 text-base disabled:opacity-50">
            {revealing ? "Revealing…" : "Reveal bids"}
          </button>
        </>
      ) : (
        <>
          <div className="card flex flex-col items-center gap-3 px-10 py-10 text-center">
            <span
              className={`rounded-full px-4 py-1 text-sm font-bold text-white ${
                revealResult.is_correct ? "bg-correct" : "bg-incorrect"
              }`}
            >
              {revealResult.is_correct ? "Correct" : "Incorrect"}
            </span>
            <p className="text-[clamp(24px,3.5vw,40px)] font-bold">{revealResult.text}</p>
            {!revealResult.is_correct && revealResult.correction && (
              <p className="text-lg font-semibold text-teal-deep">{revealResult.correction}</p>
            )}
            {revealResult.explanation && <p className="max-w-xl text-sm text-ink-muted">{revealResult.explanation}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {teams.map((t) => {
              const bid = revealResult.bids.find((b) => b.team_id === t.id);
              const delta = bid ? (revealResult.is_correct ? bid.amount : -bid.amount) * revealResult.multiplier : 0;
              return (
                <div key={t.id} className="card p-4" style={{ borderTop: `4px solid ${t.color}` }}>
                  <div className="font-bold">{t.name}</div>
                  <div className="text-sm text-ink-muted">Bid {bid?.amount ?? 0}</div>
                  <div className={`text-sm font-semibold ${delta >= 0 ? "text-correct" : "text-incorrect"}`}>
                    {delta >= 0 ? "+" : ""}
                    {delta} → {t.balance}
                  </div>
                  {!revealResult.is_correct && bid && bid.amount > 0 && !resolvedFixTeamIds.has(t.id) && (
                    <button onClick={() => setFixTeamId(t.id)} className="btn btn-secondary mt-2 w-full py-1.5 text-xs">
                      Fix it!
                    </button>
                  )}
                  {resolvedFixTeamIds.has(t.id) && <div className="mt-2 text-xs text-ink-muted">Fix resolved</div>}
                </div>
              );
            })}
          </div>

          {fixTeamId && (
            <div className="card flex flex-col gap-3 p-6">
              <h3 className="font-bold">{teams.find((t) => t.id === fixTeamId)?.name} tries to fix it — wins back half if accepted</h3>
              <input
                value={fixText}
                onChange={(e) => setFixText(e.target.value)}
                placeholder="Type what the student said"
                className="rounded-[var(--radius-control)] border border-border px-3 py-2"
              />
              <div className="flex gap-2">
                <button onClick={() => resolveFix(fixTeamId, true)} className="btn btn-primary px-5 py-2">
                  Accept
                </button>
                <button onClick={() => resolveFix(fixTeamId, false)} className="btn btn-secondary px-5 py-2">
                  Reject
                </button>
              </div>
            </div>
          )}

          <button onClick={handleAdvance} className="btn btn-primary self-center px-8 py-3 text-base">
            Next statement
          </button>
        </>
      )}
    </div>
  );
}

function TeamBidTile({
  team,
  locked,
  mode,
  gameId,
  statementId,
}: {
  team: Team;
  locked: boolean;
  mode: Game["mode"];
  gameId: string;
  statementId: string;
}) {
  const supabase = createClient();
  const [padOpen, setPadOpen] = useState(false);
  const [padValue, setPadValue] = useState("");

  async function submit(amount: number) {
    await supabase.rpc("submit_bid", {
      p_game_id: gameId,
      p_statement_id: statementId,
      p_team_id: team.id,
      p_amount: amount,
    });
    setPadOpen(false);
    setPadValue("");
  }

  if (mode === "devices") {
    return (
      <div className="card p-4" style={{ borderTop: `4px solid ${team.color}` }}>
        <div className="font-bold">{team.name}</div>
        <div className="text-xl font-bold">{team.balance.toLocaleString()}</div>
        <div className={`mt-1 text-xs font-semibold ${locked ? "text-correct" : "text-ink-muted"}`}>
          {locked ? "Bid locked" : "Still thinking"}
        </div>
      </div>
    );
  }

  return (
    <div className="card p-4" style={{ borderTop: `4px solid ${team.color}` }}>
      <button onClick={() => setPadOpen((o) => !o)} className="w-full text-left">
        <div className="font-bold">{team.name}</div>
        <div className="text-xl font-bold">{team.balance.toLocaleString()}</div>
        <div className={`mt-1 text-xs font-semibold ${locked ? "text-correct" : "text-ink-muted"}`}>
          {locked ? "Bid entered · hidden" : "Tap to enter bid"}
        </div>
      </button>
      {padOpen && (
        <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
          <input
            value={padValue}
            readOnly
            placeholder="0"
            className="rounded-[var(--radius-control)] border border-border px-3 py-2 text-right text-lg font-bold"
          />
          <div className="grid grid-cols-3 gap-1">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "Clear", "0", "⌫"].map((k) => (
              <button
                key={k}
                onClick={() => {
                  if (k === "Clear") setPadValue("");
                  else if (k === "⌫") setPadValue((v) => v.slice(0, -1));
                  else setPadValue((v) => (v + k).slice(0, 6));
                }}
                className="rounded-[10px] bg-bg py-2 text-sm font-semibold"
              >
                {k}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={() => submit(team.balance)} className="btn btn-secondary flex-1 py-2 text-xs">
              All in
            </button>
            <button onClick={() => submit(Number(padValue) || 0)} className="btn btn-primary flex-1 py-2 text-xs">
              Save and hide bid
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Leaderboard ----------

function LeaderboardView({
  game,
  set,
  teams,
  statements,
  teacherPlan,
}: {
  game: Game;
  set: GameSet;
  teams: Team[];
  statements: Statement[];
  teacherPlan: "free" | "pro";
}) {
  const ranked = useMemo(() => [...teams].sort((a, b) => b.balance - a.balance), [teams]);
  const winner = ranked[0];
  const isHomework = game.mode === "homework";

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{isHomework ? "Homework complete" : "Game over"}</h1>
          <p className="text-sm text-ink-muted">{set.title}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/library" className="btn btn-secondary px-4 py-2 text-sm">
            Back to library
          </Link>
        </div>
      </div>

      {winner && (
        <p className="text-center text-xl font-bold text-teal-deep">
          {isHomework ? `${winner.name} finished with ${winner.balance.toLocaleString()} coins` : `${winner.name} wins!`}
        </p>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {ranked.map((t, i) => (
          <div key={t.id} className="card p-4 text-center" style={{ borderTop: `4px solid ${t.color}` }}>
            <div className="text-xs font-bold text-ink-muted">#{i + 1}</div>
            <div className="font-bold">{t.name}</div>
            <div className="text-2xl font-bold">{t.balance.toLocaleString()}</div>
          </div>
        ))}
      </div>

      <div className="card p-6">
        <h2 className="mb-4 text-lg font-bold">Recap</h2>
        <div className="flex flex-col gap-3">
          {statements.map((s) => (
            <div key={s.id} className="flex items-start gap-3 border-b border-border pb-3 last:border-0">
              <span
                className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold text-white ${
                  s.is_correct ? "bg-correct" : "bg-incorrect"
                }`}
              >
                {s.is_correct ? "Correct" : "Wrong"}
              </span>
              <div>
                <p className="text-sm font-medium">{s.text}</p>
                {!s.is_correct && s.correction && <p className="text-xs text-ink-muted">Fix: {s.correction}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <ErrorReportCard gameId={game.id} teams={teams} teacherPlan={teacherPlan} />
    </div>
  );
}

function ErrorReportCard({
  gameId,
  teams,
  teacherPlan,
}: {
  gameId: string;
  teams: Team[];
  teacherPlan: "free" | "pro";
}) {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<ErrorReportRow[] | null>(null);

  async function reveal() {
    if (teacherPlan !== "pro") {
      setShowUpgrade(true);
      return;
    }
    setOpen(true);
    if (rows) return;
    setLoading(true);
    const { data } = await supabase.rpc("get_game_error_report", { p_game_id: gameId });
    setRows((data as ErrorReportRow[]) ?? []);
    setLoading(false);
  }

  const byPlayer = useMemo(() => {
    if (!rows) return [];
    const map = new Map<
      string,
      { playerId: string; nickname: string; teamName: string; teamColor: string; tags: { tag: string; count: number }[] }
    >();
    for (const r of rows) {
      if (!map.has(r.player_id)) {
        map.set(r.player_id, {
          playerId: r.player_id,
          nickname: r.nickname,
          teamName: r.team_name,
          teamColor: r.team_color,
          tags: [],
        });
      }
      map.get(r.player_id)!.tags.push({ tag: r.error_tag, count: Number(r.tag_count) });
    }
    return [...map.values()].map((p) => ({ ...p, tags: p.tags.sort((a, b) => b.count - a.count).slice(0, 3) }));
  }, [rows]);

  if (teams.length === 0) return null;

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between">
        <div>
          <span className="mb-1 inline-block rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
            Pro
          </span>
          <h2 className="text-lg font-bold">See what each student got wrong</h2>
          <p className="text-sm text-ink-muted">
            Error reports show every student&apos;s top mistakes, so you know what to teach next.
          </p>
        </div>
        {!open && (
          <button onClick={reveal} className="btn btn-secondary px-4 py-2 text-sm">
            {teacherPlan === "pro" ? "Show report" : "Upgrade to Pro"}
          </button>
        )}
      </div>

      {open && (
        <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4">
          {loading && <p className="text-sm text-ink-muted">Loading…</p>}
          {!loading && byPlayer.length === 0 && (
            <p className="text-sm text-ink-muted">No wrong bids to report — nobody got caught out this time.</p>
          )}
          {byPlayer.map((p) => (
            <div key={p.playerId} className="flex items-center justify-between border-b border-border pb-2 last:border-0">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ background: p.teamColor }} />
                <span className="text-sm font-semibold">{p.nickname}</span>
                {p.teamName !== p.nickname && <span className="text-xs text-ink-muted">{p.teamName}</span>}
              </div>
              <div className="flex gap-1.5">
                {p.tags.map((t) => (
                  <span key={t.tag} className="rounded-full bg-bg px-2 py-0.5 text-xs font-semibold text-ink-muted">
                    {t.tag} × {t.count}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showUpgrade && (
        <UpgradeModal
          title="See what each student got wrong"
          message="Upgrade to Pro for full per-student error reports — the class balances above are free, this breakdown is Pro."
          onClose={() => setShowUpgrade(false)}
        />
      )}
    </div>
  );
}
