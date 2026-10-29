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

  if (!process.env.GIPHY_API_KEY) {
    return NextResponse.json({ error: "GIF search isn't configured on this server yet." }, { status: 503 });
  }

  const params = new URLSearchParams({
    api_key: process.env.GIPHY_API_KEY,
    q: query,
    limit: "20",
    rating: "g",
  });

  let response;
  try {
    response = await fetch(`https://api.giphy.com/v1/gifs/search?${params.toString()}`);
  } catch (err) {
    console.error("Giphy request failed", err);
    return NextResponse.json({ error: "GIF search is temporarily unavailable." }, { status: 502 });
  }

  if (!response.ok) {
    console.error("Giphy request failed", response.status, await response.text().catch(() => ""));
    return NextResponse.json({ error: "GIF search is temporarily unavailable." }, { status: 502 });
  }

  const data = await response.json();
  type GiphyItem = { id: string; title: string; images: { fixed_height: { url: string }; original: { url: string } } };
  const results = (data.data ?? []).map((g: GiphyItem) => ({
    id: g.id,
    thumbnailUrl: g.images.fixed_height.url,
    fullUrl: g.images.original.url,
    alt: g.title || query,
  }));

  return NextResponse.json({ results });
}
