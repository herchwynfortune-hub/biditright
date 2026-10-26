"use client";

import Link from "next/link";

export default function UpgradeModal({
  title,
  message,
  onClose,
}: {
  title: string;
  message: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-6"
      onClick={onClose}
    >
      <div className="card w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <span className="mb-3 inline-block rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
          Pro
        </span>
        <h2 className="mb-2 text-lg font-bold">{title}</h2>
        <p className="mb-5 text-sm text-ink-muted">{message}</p>
        <div className="flex flex-col gap-2">
          <Link href="/upgrade" className="btn btn-primary py-2.5 text-center text-sm">
            Upgrade to Pro — $9.99/mo or $89.99/yr
          </Link>
          <button onClick={onClose} className="btn btn-secondary py-2.5 text-sm">
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
