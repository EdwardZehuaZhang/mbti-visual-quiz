import { NextResponse } from "next/server";
import type { ImageResult } from "@/types/quiz";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function extractPinterestImageUrl(
  pin: { media?: { images?: Record<string, { url?: string }> } }
): string | null {
  const imgs = pin.media?.images;
  if (!imgs) return null;
  return imgs["736x"]?.url || imgs["564x"]?.url || imgs["236x"]?.url || null;
}

// --- Pinterest ---
async function fetchPinterest(
  query: string,
  pinId: string | null,
  token: string
): Promise<ImageResult[]> {
  const headers = { Authorization: `Bearer ${token}` };

  if (pinId) {
    try {
      const res = await fetch(
        `https://api.pinterest.com/v5/pins/${pinId}/related_pins`,
        { headers }
      );
      if (res.ok) {
        const data = await res.json();
        const pins: ImageResult[] = [];
        for (const pin of data.pins || data.items || []) {
          const url = extractPinterestImageUrl(pin);
          if (url) pins.push({ id: pin.id, url, description: pin.description || query, alt: pin.alt_text || query });
        }
        if (pins.length >= 4) return shuffle(pins).slice(0, 4);
      }
    } catch {}
  }

  const res = await fetch(
    `https://api.pinterest.com/v5/search/pins?query=${encodeURIComponent(query)}&page_size=20`,
    { headers }
  );
  if (!res.ok) return [];
  const data = await res.json();
  const pins: ImageResult[] = [];
  for (const pin of data.pins || data.items || []) {
    const url = extractPinterestImageUrl(pin);
    if (url) pins.push({ id: pin.id, url, description: pin.description || query, alt: pin.alt_text || query });
  }
  return shuffle(pins).slice(0, 4);
}

// --- Unsplash (fetch 30, sort by likes, return top 4) ---
async function fetchUnsplash(query: string, key: string): Promise<ImageResult[]> {
  const res = await fetch(
    `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=30&orientation=squarish&order_by=popular&content_filter=high`,
    { headers: { Authorization: `Client-ID ${key}` } }
  );
  if (!res.ok) return [];
  const data = await res.json();
  const sorted = [...(data.results || [])].sort(
    (a: { likes: number }, b: { likes: number }) => b.likes - a.likes
  );
  return sorted.slice(0, 8).map((img: {
    id: string;
    urls: { regular: string };
    description: string | null;
    alt_description: string | null;
    likes: number;
  }) => ({
    id: img.id,
    url: img.urls.regular,
    description: img.description || img.alt_description || query,
    alt: img.alt_description || query,
  }));
}

// --- Pexels (sort by curated/popular) ---
async function fetchPexels(query: string, key: string): Promise<ImageResult[]> {
  const res = await fetch(
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=20&size=large`,
    { headers: { Authorization: key } }
  );
  if (!res.ok) return [];
  const data = await res.json();
  const photos = (data.photos || []) as Array<{
    id: number;
    src: { large2x: string; large: string };
    alt: string;
    photographer: string;
  }>;
  // Pexels doesn't expose likes, but their results are curated — shuffle top results for variety
  return shuffle(photos).slice(0, 8).map((photo) => ({
    id: `pexels-${photo.id}`,
    url: photo.src.large2x || photo.src.large,
    description: photo.alt || query,
    alt: photo.alt || query,
  }));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || "nature";
  const pinId = searchParams.get("pinId") || null;

  const pinterestToken = process.env.PINTEREST_ACCESS_TOKEN;
  const unsplashKey = process.env.UNSPLASH_ACCESS_KEY;
  const pexelsKey = process.env.PEXELS_API_KEY;

  // 1. Try Pinterest
  if (pinterestToken) {
    try {
      const results = await fetchPinterest(query, pinId, pinterestToken);
      if (results.length >= 4) return NextResponse.json(results.slice(0, 4));
    } catch (e) {
      console.error("Pinterest error:", e);
    }
  }

  // 2. Fetch from Unsplash + Pexels in parallel, merge, shuffle, pick 4
  const sources: Promise<ImageResult[]>[] = [];
  if (unsplashKey) sources.push(fetchUnsplash(query, unsplashKey).catch(() => []));
  if (pexelsKey) sources.push(fetchPexels(query, pexelsKey).catch(() => []));

  if (sources.length > 0) {
    const results = await Promise.all(sources);
    const merged = shuffle(results.flat());
    if (merged.length >= 4) return NextResponse.json(merged.slice(0, 4));
  }

  // 3. Picsum fallback
  const placeholders: ImageResult[] = Array.from({ length: 4 }, (_, i) => ({
    id: `placeholder-${i}`,
    url: `https://picsum.photos/seed/${encodeURIComponent(query)}-${i}-${Date.now()}/800/800`,
    description: `${query} - image ${i + 1}`,
    alt: `${query} visual ${i + 1}`,
  }));
  return NextResponse.json(placeholders);
}