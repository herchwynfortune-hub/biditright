export type Statement = {
  id: string;
  set_id: string;
  position: number;
  text: string;
  is_correct: boolean;
  correction: string | null;
  explanation: string | null;
  error_tag: string | null;
};

export type GameSet = {
  id: string;
  owner_id: string | null;
  title: string;
  subject: string;
  level: string | null;
  is_premade: boolean;
  pack_id: string | null;
  created_at: string;
};

export type Game = {
  id: string;
  set_id: string;
  host_id: string;
  join_code: string;
  mode: "devices" | "one_screen" | "homework";
  status: "lobby" | "active" | "paused" | "ended";
  current_statement_index: number;
  timer_seconds: number;
  double_round: boolean;
  theme: string;
  started_at: string | null;
  ended_at: string | null;
};

export type Team = {
  id: string;
  game_id: string;
  name: string;
  color: string;
  balance: number;
  bailout_used: boolean;
  captain_player_id: string | null;
};

export type Player = {
  id: string;
  game_id: string;
  team_id: string | null;
  nickname: string;
  is_captain: boolean;
  player_token: string;
  joined_at: string;
};

export type PremadeSetSummary = {
  id: string;
  title: string;
  subject: string;
  level: string | null;
  pack_id: string | null;
  statement_count: number;
};

export type SetSummary = {
  id: string;
  title: string;
  subject: string;
  level: string | null;
  is_premade: boolean;
  pack_id: string | null;
  owner_id: string | null;
};

export type ErrorReportRow = {
  player_id: string;
  nickname: string;
  team_id: string;
  team_name: string;
  team_color: string;
  error_tag: string;
  tag_count: number;
};

export type BidStatus = {
  id: string;
  game_id: string;
  statement_id: string;
  team_id: string;
  amount: number | null;
  locked: boolean;
  revealed: boolean;
  submitted_at: string;
};

export type RevealResult = {
  statement_id: string;
  text: string;
  is_correct: boolean;
  correction: string | null;
  explanation: string | null;
  multiplier: number;
  bids: { team_id: string; amount: number; entered_by: "captain" | "teacher" }[];
};

export const TEAM_COLORS = [
  "#2556d9", // blue
  "#ff7a2f", // orange
  "#0b7a5c", // teal
  "#8e3bb5", // purple
  "#d9402a", // red
  "#c9a500", // gold
  "#1d8aa8", // sky
  "#b5457a", // pink
  "#5c6b69", // slate
  "#4a7a2f", // olive
];

export const TEAM_NAME_POOL = [
  "Falcon",
  "Comet",
  "Maple",
  "Tiger",
  "Otter",
  "Ember",
  "Nova",
  "Lynx",
  "Harbor",
  "Quartz",
];

export const BID_PRESETS = [0, 100, 250];
