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

function extractImageUrl(
  pin: { media?: { images?: Record<string, { url?: string }> } }
): string | null {
  const imgs = pin.media?.images;
  if (!imgs) return null;
  return imgs["736x"]?.url || imgs["564x"]?.url || imgs["236x"]?.url || null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || "nature";
  const pinId = searchParams.get("pinId");

  const token = process.env.PINTEREST_ACCESS_TOKEN;

  if (token) {
    const headers = { Authorization: `Bearer ${token}` };

    // Try related pins first if pinId is provided
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
            const url = extractImageUrl(pin);
            if (url) {
              pins.push({
                id: pin.id,
                url,
                description: pin.description || pin.title || query,
                alt: pin.alt_text || pin.title || query,
              });
            }
          }
          if (pins.length >= 4) {
            return NextResponse.json(shuffle(pins).slice(0, 4));
          }
        }
      } catch (error) {
        console.error("Pinterest related pins error:", error);
      }
    }

    // Fall back to regular search
    try {
      const res = await fetch(
        `https://api.pinterest.com/v5/search/pins?query=${encodeURIComponent(query)}&page_size=20`,
        { headers }
      );

      if (!res.ok) throw new Error(`Pinterest API error: ${res.status}`);

      const data = await res.json();
      const pins: ImageResult[] = [];
      for (const pin of data.pins || data.items || []) {
        const url = extractImageUrl(pin);
        if (url) {
          pins.push({
            id: pin.id,
            url,
            description: pin.description || pin.title || query,
            alt: pin.alt_text || pin.title || query,
          });
        }
      }

      if (pins.length >= 4) {
        return NextResponse.json(shuffle(pins).slice(0, 4));
      }
    } catch (error) {
      console.error("Pinterest search error:", error);
    }
  }

  // Fallback: picsum placeholder images
  const placeholders: ImageResult[] = Array.from({ length: 4 }, (_, i) => {
    const seed = `${query}-${i}-${Date.now()}`;
    return {
      id: `placeholder-${i}`,
      url: `https://picsum.photos/seed/${encodeURIComponent(seed)}/600/600`,
      description: `${query} - image ${i + 1}`,
      alt: `${query} visual ${i + 1}`,
    };
  });

  return NextResponse.json(placeholders);
}
