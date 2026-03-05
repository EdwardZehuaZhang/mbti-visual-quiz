import { NextRequest, NextResponse } from 'next/server'
import { fetchImages } from '@/lib/pinterest'

export async function GET(req: NextRequest) {
  try {
    const query = req.nextUrl.searchParams.get('q')
    if (!query) {
      return NextResponse.json({ error: 'Missing query parameter' }, { status: 400 })
    }

    const images = await fetchImages(query)
    return NextResponse.json({ images })
  } catch (error) {
    console.error('Pinterest API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch images' },
      { status: 500 }
    )
  }
}
