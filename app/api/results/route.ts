import { NextRequest, NextResponse } from 'next/server'
import { generateResults } from '@/lib/openai'
import type { PersonalityState } from '@/lib/types'

export async function POST(req: NextRequest) {
  try {
    const state: PersonalityState = await req.json()
    const results = await generateResults(state)
    return NextResponse.json(results)
  } catch (error) {
    console.error('Results API error:', error)
    return NextResponse.json(
      { error: 'Failed to generate results' },
      { status: 500 }
    )
  }
}
