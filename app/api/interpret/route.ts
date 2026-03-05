import { NextRequest, NextResponse } from 'next/server'
import { interpretChoice } from '@/lib/openai'
import type { PersonalityState, MBTIAxis } from '@/lib/types'

const MAX_TURNS = 15
const CONFIDENCE_THRESHOLD = 0.75

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      chosenImageUrl,
      allImageUrls,
      scene,
      axis,
      intent,
      state,
    }: {
      chosenImageUrl: string
      allImageUrls: string[]
      scene: string
      axis: MBTIAxis
      intent: string
      state: PersonalityState
    } = body

    const result = await interpretChoice(
      chosenImageUrl,
      allImageUrls,
      scene,
      axis,
      intent,
      state
    )

    // Update personality state
    const newState: PersonalityState = {
      ...state,
      signals: {
        ...state.signals,
        [axis]: Math.max(-1, Math.min(1, state.signals[axis] + result.signalDelta)),
      },
      confidence: {
        ...state.confidence,
        [axis]: Math.min(1, state.confidence[axis] + result.confidenceDelta),
      },
      choices: [
        ...state.choices,
        {
          imageUrl: chosenImageUrl,
          scene,
          axis,
          interpretation: result.interpretation,
        },
      ],
      turn: state.turn + 1,
    }

    // Check if quiz is done
    const allConfident = Object.values(newState.confidence).every(
      (c) => c >= CONFIDENCE_THRESHOLD
    )
    const maxTurnsReached = newState.turn >= MAX_TURNS
    const done = allConfident || maxTurnsReached

    return NextResponse.json({
      state: newState,
      interpretation: result.interpretation,
      done,
    })
  } catch (error) {
    console.error('Interpret API error:', error)
    return NextResponse.json(
      { error: 'Failed to interpret choice' },
      { status: 500 }
    )
  }
}
