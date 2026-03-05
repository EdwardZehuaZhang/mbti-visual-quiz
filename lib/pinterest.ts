import type { ImageItem } from './types'

// Uses Unsplash API as the image source (Pinterest requires OAuth)
export async function fetchImages(query: string): Promise<ImageItem[]> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY
  if (!accessKey) throw new Error('UNSPLASH_ACCESS_KEY not set')

  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=4&orientation=landscape`

  const response = await fetch(url, {
    headers: {
      Authorization: `Client-ID ${accessKey}`,
    },
    next: { revalidate: 3600 }, // cache 1 hour
  })

  if (!response.ok) {
    throw new Error(`Unsplash API error: ${response.status}`)
  }

  const data = await response.json()

  if (!data.results || data.results.length === 0) {
    // Fallback: return placeholder images
    return generatePlaceholders(query)
  }

  return data.results.slice(0, 4).map((photo: {
    id: string
    urls: { regular: string; thumb: string }
    alt_description: string | null
    description: string | null
  }) => ({
    id: photo.id,
    url: photo.urls.regular,
    thumbUrl: photo.urls.thumb,
    alt: photo.alt_description || photo.description || query,
  }))
}

function generatePlaceholders(query: string): ImageItem[] {
  const seeds = ['nature', 'city', 'abstract', 'portrait']
  return seeds.map((seed, i) => ({
    id: `placeholder-${i}`,
    url: `https://source.unsplash.com/800x600/?${encodeURIComponent(query)},${seed}`,
    thumbUrl: `https://source.unsplash.com/400x300/?${encodeURIComponent(query)},${seed}`,
    alt: `${query} - ${seed}`,
  }))
}
