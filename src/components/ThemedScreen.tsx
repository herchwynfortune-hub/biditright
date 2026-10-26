import { getTheme } from "@/lib/game/themes";

export default function ThemedScreen({ theme, children }: { theme: string; children: React.ReactNode }) {
  const t = getTheme(theme);
  return (
    <div style={t.colors as React.CSSProperties} className="flex flex-1 flex-col bg-bg text-ink">
      {children}
    </div>
  );
}
