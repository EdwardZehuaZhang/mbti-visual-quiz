import { NextResponse } from "next/server";
import type { ImageResult } from "@/types/quiz";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || "nature";

  const unsplashKey = process.env.UNSPLASH_ACCESS_KEY;

  if (unsplashKey) {
    try {
      const res = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=4&orientation=squarish`,
        {
          headers: { Authorization: `Client-ID ${unsplashKey}` },
        }
      );

      if (!res.ok) throw new Error(`Unsplash API error: ${res.status}`);

      const data = await res.json();
      const images: ImageResult[] = data.results.map(
        (img: {
          id: string;
          urls: { regular: string };
          description: string | null;
          alt_description: string | null;
        }) => ({
          id: img.id,
          url: img.urls.regular,
          description: img.description || img.alt_description || query,
          alt: img.alt_description || query,
        })
      );

      return NextResponse.json(images);
    } catch (error) {
      console.error("Unsplash fetch error:", error);
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
