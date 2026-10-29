"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type SearchResult = { id: string; thumbnailUrl: string; fullUrl: string; alt: string };

export default function ImagePicker({
  statementId,
  imageUrl,
  onChange,
}: {
  statementId: string;
  imageUrl: string | null;
  onChange: (url: string | null) => void;
}) {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"photos" | "gifs">("photos");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !query.trim()) {
      setResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setSearching(true);
      setError(null);
      const res = await fetch(`/api/image-search/${tab}?q=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      setSearching(false);
      if (!res.ok) {
        setError(data.error ?? "Search failed");
        setResults([]);
        return;
      }
      setResults(data.results ?? []);
    }, 400);
    return () => clearTimeout(timeout);
  }, [query, tab, open]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploading(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setUploading(false);
      return;
    }

    const ext = file.name.split(".").pop() ?? "png";
    const path = `${user.id}/${statementId}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("statement-images").upload(path, file, { upsert: true });
    if (uploadError) {
      setUploading(false);
      setError(uploadError.message);
      return;
    }

    const { data: pub } = supabase.storage.from("statement-images").getPublicUrl(path);
    const url = `${pub.publicUrl}?v=${Date.now()}`;
    setUploading(false);
    onChange(url);
    setOpen(false);
  }

  if (imageUrl) {
    return (
      <div className="flex items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt="" className="h-12 w-12 rounded-[var(--radius-control)] border border-border object-cover" />
        <button type="button" onClick={() => setOpen(true)} className="text-xs font-semibold text-teal-deep hover:underline">
          Change
        </button>
        <button type="button" onClick={() => onChange(null)} className="text-xs font-semibold text-incorrect hover:underline">
          Remove
        </button>
        {open && (
          <ImageSearchPanel
            tab={tab}
            setTab={setTab}
            query={query}
            setQuery={setQuery}
            results={results}
            searching={searching}
            uploading={uploading}
            error={error}
            onPick={(url) => {
              onChange(url);
              setOpen(false);
            }}
            onUpload={handleUpload}
            onClose={() => setOpen(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} className="btn btn-secondary px-3 py-1.5 text-xs">
        + Add image
      </button>
      {open && (
        <ImageSearchPanel
          tab={tab}
          setTab={setTab}
          query={query}
          setQuery={setQuery}
          results={results}
          searching={searching}
          uploading={uploading}
          error={error}
          onPick={(url) => {
            onChange(url);
            setOpen(false);
          }}
          onUpload={handleUpload}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

function ImageSearchPanel({
  tab,
  setTab,
  query,
  setQuery,
  results,
  searching,
  uploading,
  error,
  onPick,
  onUpload,
  onClose,
}: {
  tab: "photos" | "gifs";
  setTab: (t: "photos" | "gifs") => void;
  query: string;
  setQuery: (q: string) => void;
  results: SearchResult[];
  searching: boolean;
  uploading: boolean;
  error: string | null;
  onPick: (url: string) => void;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  return (
    <div
      ref={panelRef}
      className="card absolute left-0 top-full z-10 mt-2 flex w-80 flex-col gap-3 p-4 shadow-lg"
      style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}
    >
      <div className="flex rounded-[var(--radius-control)] bg-bg p-1 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setTab("photos")}
          className={`flex-1 rounded-[8px] py-1.5 ${tab === "photos" ? "bg-card shadow-sm" : "text-ink-muted"}`}
        >
          Photos
        </button>
        <button
          type="button"
          onClick={() => setTab("gifs")}
          className={`flex-1 rounded-[8px] py-1.5 ${tab === "gifs" ? "bg-card shadow-sm" : "text-ink-muted"}`}
        >
          GIFs
        </button>
      </div>

      <input
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={tab === "photos" ? "Search photos…" : "Search GIFs…"}
        className="rounded-[var(--radius-control)] border border-border px-3 py-2 text-sm outline-none focus:border-teal-deep"
      />

      {error && <p className="text-xs text-incorrect">{error}</p>}
      {searching && <p className="text-xs text-ink-muted">Searching…</p>}

      {results.length > 0 && (
        <div className="grid max-h-56 grid-cols-3 gap-2 overflow-y-auto">
          {results.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => onPick(r.fullUrl)}
              className="aspect-square overflow-hidden rounded-[var(--radius-control)] border border-border hover:border-teal-deep"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={r.thumbnailUrl} alt={r.alt} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      <p className="text-[10px] text-ink-muted">{tab === "photos" ? "Photos via Pixabay" : "Powered by GIPHY"}</p>

      <div className="border-t border-border pt-3">
        <label className="btn btn-secondary w-full cursor-pointer py-2 text-center text-xs">
          {uploading ? "Uploading…" : "Upload from your computer"}
          <input type="file" accept="image/*" className="hidden" onChange={onUpload} disabled={uploading} />
        </label>
      </div>
    </div>
  );
}
