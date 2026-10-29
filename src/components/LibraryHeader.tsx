import Link from "next/link";
import SignOutButton from "@/components/SignOutButton";

export default function LibraryHeader({ name, isPro }: { name: string; isPro: boolean }) {
  return (
    <header className="mb-6 flex items-center justify-between">
      <Link href="/" className="flex items-center gap-2">
        <span className="h-7 w-7 rounded-full bg-gold border-2 border-ink" />
        <span className="font-display text-lg font-bold">bid it right</span>
      </Link>
      <div className="flex items-center gap-3 text-sm">
        {!isPro && (
          <Link
            href="/upgrade"
            className="rounded-full bg-gold px-4 py-1.5 font-bold text-ink transition-transform hover:scale-105"
          >
            Upgrade to Pro
          </Link>
        )}
        <span className="text-ink-muted">{name}</span>
        <SignOutButton />
      </div>
    </header>
  );
}
