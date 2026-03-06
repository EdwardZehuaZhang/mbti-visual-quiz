import { NextResponse } from "next/server";
import type { ImageResult } from "@/types/quiz";

async function fetchPexels(query: string, key: string, orientation: string): Promise<ImageResult | null> {
  const pexelsOrientation = orientation === "landscape" ? "landscape" : "portrait";
  const res = await fetch(
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1&size=large&orientation=${pexelsOrientation}`,
    { headers: { Authorization: key } }
  );
  if (!res.ok) return null;
  const data = await res.json();
  const photo = (data.photos as Array<{
    id: number;
    src: { large2x: string; large: string; portrait: string; landscape: string };
    alt: string;
  }>)?.[0];
  if (!photo) return null;
  return {
    id: `pexels-${photo.id}`,
    url: (pexelsOrientation === "portrait" ? photo.src.portrait : photo.src.landscape) || photo.src.large2x || photo.src.large,
    description: photo.alt || query,
    alt: photo.alt || query,
  };
}

async function fetchUnsplash(query: string, key: string, orientation: string): Promise<ImageResult | null> {
  const unsplashOrientation = orientation === "landscape" ? "landscape" : "portrait";
  const res = await fetch(
    `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=${unsplashOrientation}&order_by=popular&content_filter=high`,
    { headers: { Authorization: `Client-ID ${key}` } }
  );
  if (!res.ok) return null;
  const data = await res.json();
  const img = (data.results as Array<{
    id: string;
    urls: { full: string; regular: string };
    description: string | null;
    alt_description: string | null;
  }>)?.[0];
  if (!img) return null;
  return {
    id: img.id,
    url: img.urls.regular || img.urls.full,
    description: img.description || img.alt_description || query,
    alt: img.alt_description || query,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || "nature";
  const orientation = searchParams.get("orientation") || "portrait";

  const pexelsKey = process.env.PEXELS_API_KEY;
  const unsplashKey = process.env.UNSPLASH_ACCESS_KEY;

  if (pexelsKey) {
    const result = await fetchPexels(query, pexelsKey, orientation).catch(() => null);
    if (result) return NextResponse.json(result);
  }

  if (unsplashKey) {
    const result = await fetchUnsplash(query, unsplashKey, orientation).catch(() => null);
    if (result) return NextResponse.json(result);
  }

  return NextResponse.json({
    id: `placeholder-${Date.now()}`,
    url: `https://picsum.photos/seed/${encodeURIComponent(query)}-${Date.now()}/1200/1600`,
    description: query,
    alt: query,
  });
}