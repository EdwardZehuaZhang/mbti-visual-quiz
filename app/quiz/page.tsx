'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import ImageGrid from '@/components/ImageGrid'
import ProgressBar from '@/components/ProgressBar'
import type { PersonalityState, SceneResponse, ImageItem } from '@/lib/types'

const initialState: PersonalityState = {
  signals: { EI: 0, SN: 0, TF: 0, JP: 0 },
  confidence: { EI: 0, SN: 0, TF: 0, JP: 0 },
  choices: [],
  turn: 0,
}

type Phase = 'loading' | 'ready' | 'selected' | 'transitioning' | 'done'

export default function QuizPage() {
  const router = useRouter()
  const [state, setState] = useState<PersonalityState>(initialState)
  const [scene, setScene] = useState<SceneResponse | null>(null)
  const [images, setImages] = useState<ImageItem[]>([])
  const [phase, setPhase] = useState<Phase>('loading')
  const [selectedImage, setSelectedImage] = useState<ImageItem | null>(null)
  const [interpretation, setInterpretation] = useState<string>('')
  const [error, setError] = useState<string>('')

  const loadNextScene = useCallback(async (currentState: PersonalityState) => {
    setPhase('loading')
    setSelectedImage(null)
    setInterpretation('')

    try {
      // Get scene from GPT
      const sceneRes = await fetch('/api/scene', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentState),
      })
      if (!sceneRes.ok) throw new Error('Failed to load scene')
      const newScene: SceneResponse = await sceneRes.json()
      setScene(newScene)

      // Fetch images for the scene
      const imgRes = await fetch(`/api/pinterest?q=${encodeURIComponent(newScene.pinterestQuery)}`)
      if (!imgRes.ok) throw new Error('Failed to load images')
      const imgData = await imgRes.json()
      setImages(imgData.images)

      setPhase('ready')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    }
  }, [])

  // Load first scene on mount
  useEffect(() => {
    loadNextScene(initialState)
  }, [loadNextScene])

  const handleSelect = async (image: ImageItem) => {
    if (phase !== 'ready' || !scene) return

    setSelectedImage(image)
    setPhase('selected')

    try {
      const res = await fetch('/api/interpret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chosenImageUrl: image.url,
          allImageUrls: images.map((i) => i.url),
          scene: scene.scene,
          axis: scene.axis,
          intent: scene.intent,
          state,
        }),
      })

      if (!res.ok) throw new Error('Failed to interpret choice')
      const data = await res.json()

      setInterpretation(data.interpretation)
      setState(data.state)

      // Brief pause to show interpretation, then proceed
      await new Promise((r) => setTimeout(r, 2000))

      if (data.done) {
        // Save state and go to results
        sessionStorage.setItem('mbtiState', JSON.stringify(data.state))
        router.push('/results')
      } else {
        setPhase('transitioning')
        await new Promise((r) => setTimeout(r, 500))
        loadNextScene(data.state)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setPhase('ready')
      setSelectedImage(null)
    }
  }

  if (error) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
        <p className="text-red-400 mb-4">{error}</p>
        <button
          onClick={() => { setError(''); loadNextScene(state) }}
          className="text-sm text-gray-400 underline"
        >
          Try again
        </button>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 gap-8">
      {/* Progress */}
      <div className="w-full max-w-2xl">
        <ProgressBar turn={state.turn} maxTurns={15} confidence={state.confidence} />
      </div>

      {/* Scene */}
      <div className="text-center max-w-lg min-h-[3rem]">
        {phase === 'loading' || phase === 'transitioning' ? (
          <div className="text-gray-600 animate-pulse">...</div>
        ) : scene ? (
          <p className="text-lg font-light text-gray-200 leading-relaxed">
            {scene.scene}
          </p>
        ) : null}
      </div>

      {/* Images */}
      {phase === 'loading' || phase === 'transitioning' ? (
        <div className="grid grid-cols-2 gap-3 w-full max-w-2xl">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="aspect-square bg-gray-900 rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : (
        <ImageGrid
          images={images}
          onSelect={handleSelect}
          disabled={phase !== 'ready'}
          selectedId={selectedImage?.id}
        />
      )}

      {/* Interpretation flash */}
      {interpretation && phase === 'selected' && (
        <p className="text-sm text-gray-400 italic text-center max-w-md">
          {interpretation}
        </p>
      )}

      {/* Hint */}
      {phase === 'ready' && (
        <p className="text-xs text-gray-600">
          Choose the image that pulls you in
        </p>
      )}
    </main>
  )
}
