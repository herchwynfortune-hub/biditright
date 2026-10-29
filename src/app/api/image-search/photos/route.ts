import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Must be signed in" }, { status: 401 });
  }

  const query = new URL(request.url).searchParams.get("q")?.trim();
  if (!query) {
    return NextResponse.json({ error: "Missing search query" }, { status: 400 });
  }

  if (!process.env.PIXABAY_API_KEY) {
    return NextResponse.json({ error: "Photo search isn't configured on this server yet." }, { status: 503 });
  }

  const params = new URLSearchParams({
    key: process.env.PIXABAY_API_KEY,
    q: query,
    image_type: "photo",
    safesearch: "true",
    per_page: "20",
  });

  let response;
  try {
    response = await fetch(`https://pixabay.com/api/?${params.toString()}`);
  } catch (err) {
    console.error("Pixabay request failed", err);
    return NextResponse.json({ error: "Photo search is temporarily unavailable." }, { status: 502 });
  }

  if (!response.ok) {
    console.error("Pixabay request failed", response.status, await response.text().catch(() => ""));
    return NextResponse.json({ error: "Photo search is temporarily unavailable." }, { status: 502 });
  }

  const data = await response.json();
  type PixabayHit = { id: number; webformatURL: string; largeImageURL: string; tags: string };
  const results = (data.hits ?? []).map((p: PixabayHit) => ({
    id: String(p.id),
    thumbnailUrl: p.webformatURL,
    fullUrl: p.largeImageURL,
    alt: p.tags || query,
  }));

  return NextResponse.json({ results });
}
