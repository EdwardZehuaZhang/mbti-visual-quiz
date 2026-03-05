import { NextRequest, NextResponse } from 'next/server'
import { generateScene } from '@/lib/openai'
import type { PersonalityState } from '@/lib/types'

export async function POST(req: NextRequest) {
  try {
    const state: PersonalityState = await req.json()
    const scene = await generateScene(state)
    return NextResponse.json(scene)
  } catch (error) {
    console.error('Scene API error:', error)
    return NextResponse.json(
      { error: 'Failed to generate scene' },
      { status: 500 }
    )
  }
}
