export type ThemeId = "default" | "midnight" | "sunset" | "forest" | "ocean";

export const THEMES: { id: ThemeId; label: string; pro: boolean; colors: Record<string, string> }[] = [
  {
    id: "default",
    label: "Default",
    pro: false,
    colors: {
      "--color-bg": "#eef4f2",
      "--color-card": "#ffffff",
      "--color-ink": "#10201f",
      "--color-orange": "#ff7a2f",
      "--color-teal-deep": "#0d5c58",
      "--color-gold": "#ffc531",
    },
  },
  {
    id: "midnight",
    label: "Midnight",
    pro: true,
    colors: {
      "--color-bg": "#161327",
      "--color-card": "#231f3d",
      "--color-ink": "#f2f0ff",
      "--color-ink-muted": "#a79fd1",
      "--color-border": "#362f57",
      "--color-orange": "#ff7a2f",
      "--color-teal-deep": "#2a2152",
      "--color-gold": "#ffc531",
    },
  },
  {
    id: "sunset",
    label: "Sunset",
    pro: true,
    colors: {
      "--color-bg": "#fff1e8",
      "--color-card": "#ffffff",
      "--color-ink": "#3a1a0f",
      "--color-orange": "#f2542d",
      "--color-teal-deep": "#8e3b46",
      "--color-gold": "#ffb84d",
    },
  },
  {
    id: "forest",
    label: "Forest",
    pro: true,
    colors: {
      "--color-bg": "#eef2e6",
      "--color-card": "#ffffff",
      "--color-ink": "#1c2b18",
      "--color-orange": "#d9842f",
      "--color-teal-deep": "#2f5233",
      "--color-gold": "#c9a53b",
    },
  },
  {
    id: "ocean",
    label: "Ocean",
    pro: true,
    colors: {
      "--color-bg": "#e9f4fb",
      "--color-card": "#ffffff",
      "--color-ink": "#0b2238",
      "--color-orange": "#ff8c42",
      "--color-teal-deep": "#0b5478",
      "--color-gold": "#ffd166",
    },
  },
];

export function getTheme(id: string) {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}
