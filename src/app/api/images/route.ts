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

async function fetchPinterest(query: string, pinId: string | null, token: string): Promise<ImageResult[]> {
  const headers = { Authorization: `Bearer ${token}` };
  if (pinId) {
    try {
      const res = await fetch(`https://api.pinterest.com/v5/pins/${pinId}/related_pins`, { headers });
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

async function fetchPexels(query: string, key: string, orientation: string): Promise<ImageResult[]> {
  const pexelsOrientation = orientation === "landscape" ? "landscape" : "portrait";
  const res = await fetch(
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=40&size=large&orientation=${pexelsOrientation}`,
    { headers: { Authorization: key } }
  );
  if (!res.ok) return [];
  const data = await res.json();
  const photos = (data.photos || []) as Array<{
    id: number;
    src: { original: string; large2x: string; large: string; portrait: string; landscape: string };
    alt: string;
  }>;
  const topPool = photos.slice(0, 15);
  return shuffle(topPool).slice(0, 8).map((photo) => ({
    id: `pexels-${photo.id}`,
    url: (pexelsOrientation === "portrait" ? photo.src.portrait : photo.src.landscape) || photo.src.large2x || photo.src.large,
    description: photo.alt || query,
    alt: photo.alt || query,
  }));
}

async function fetchUnsplash(query: string, key: string, orientation: string): Promise<ImageResult[]> {
  const unsplashOrientation = orientation === "landscape" ? "landscape" : "portrait";
  const res = await fetch(
    `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=30&orientation=${unsplashOrientation}&order_by=popular&content_filter=high`,
    { headers: { Authorization: `Client-ID ${key}` } }
  );
  if (!res.ok) return [];
  const data = await res.json();
  const sorted = [...(data.results || [])].sort(
    (a: { likes: number }, b: { likes: number }) => b.likes - a.likes
  );
  return sorted.slice(0, 8).map((img: {
    id: string;
    urls: { full: string; regular: string };
    description: string | null;
    alt_description: string | null;
  }) => ({
    id: img.id,
    url: img.urls.full || img.urls.regular,
    description: img.description || img.alt_description || query,
    alt: img.alt_description || query,
  }));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || "nature";
  const pinId = searchParams.get("pinId") || null;
  const orientation = searchParams.get("orientation") || "portrait";

  const pinterestToken = process.env.PINTEREST_ACCESS_TOKEN;
  const pexelsKey = process.env.PEXELS_API_KEY;
  const unsplashKey = process.env.UNSPLASH_ACCESS_KEY;

  if (pinterestToken) {
    try {
      const results = await fetchPinterest(query, pinId, pinterestToken);
      if (results.length >= 4) return NextResponse.json(results.slice(0, 4));
    } catch (e) {
      console.error("Pinterest error:", e);
    }
  }

  const sources: Promise<ImageResult[]>[] = [];
  if (pexelsKey) sources.push(fetchPexels(query, pexelsKey, orientation).catch(() => []));
  if (unsplashKey) sources.push(fetchUnsplash(query, unsplashKey, orientation).catch(() => []));

  if (sources.length > 0) {
    const results = await Promise.all(sources);
    const merged = shuffle(results.flat());
    if (merged.length >= 4) return NextResponse.json(merged.slice(0, 4));
    if (merged.length > 0) return NextResponse.json(merged);
  }

  const placeholders: ImageResult[] = Array.from({ length: 4 }, (_, i) => ({
    id: `placeholder-${i}`,
    url: `https://picsum.photos/seed/${encodeURIComponent(query)}-${i}-${Date.now()}/1200/1600`,
    description: `${query} - image ${i + 1}`,
    alt: `${query} visual ${i + 1}`,
  }));
  return NextResponse.json(placeholders);
}