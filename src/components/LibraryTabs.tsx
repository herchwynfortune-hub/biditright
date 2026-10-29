import Link from "next/link";

export default function LibraryTabs({ active }: { active: "my-sets" | "premade" }) {
  return (
    <div className="mb-8 flex gap-2 border-b border-border">
      <Link
        href="/library/my-sets"
        className={`border-b-2 px-1 pb-3 text-sm font-semibold ${
          active === "my-sets" ? "border-teal-deep text-teal-deep" : "border-transparent text-ink-muted hover:text-ink"
        }`}
      >
        My sets
      </Link>
      <Link
        href="/library"
        className={`border-b-2 px-1 pb-3 text-sm font-semibold ${
          active === "premade" ? "border-teal-deep text-teal-deep" : "border-transparent text-ink-muted hover:text-ink"
        }`}
      >
        Premade sets
      </Link>
    </div>
  );
}
