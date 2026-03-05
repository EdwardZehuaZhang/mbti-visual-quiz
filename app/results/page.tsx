'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { PersonalityState, ResultsResponse } from '@/lib/types'

export default function ResultsPage() {
  const [results, setResults] = useState<ResultsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const raw = sessionStorage.getItem('mbtiState')
    if (!raw) {
      setError('No quiz data found. Please take the quiz first.')
      setLoading(false)
      return
    }

    const state: PersonalityState = JSON.parse(raw)

    fetch('/api/results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state),
    })
      .then((r) => r.json())
      .then((data) => {
        setResults(data)
        setLoading(false)
      })
      .catch(() => {
        setError('Failed to generate your results.')
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
        <div className="space-y-3 animate-pulse">
          <div className="h-16 w-32 bg-gray-800 rounded mx-auto" />
          <div className="h-4 w-64 bg-gray-800 rounded mx-auto" />
          <div className="h-4 w-48 bg-gray-800 rounded mx-auto" />
        </div>
        <p className="text-gray-600 text-sm mt-8">Analysing your choices...</p>
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
        <p className="text-red-400 mb-4">{error}</p>
        <Link href="/quiz" className="text-sm text-gray-400 underline">
          Take the quiz
        </Link>
      </main>
    )
  }

  if (!results) return null

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
      <div className="max-w-lg space-y-10">
        {/* Type */}
        <div className="space-y-2">
          <p className="text-gray-500 text-sm uppercase tracking-widest">Your type</p>
          <h1 className="text-7xl font-light tracking-tight">{results.type}</h1>
        </div>

        {/* Narrative */}
        <p className="text-gray-300 text-lg font-light leading-relaxed">
          {results.narrative}
        </p>

        {/* Traits */}
        <div className="flex flex-wrap gap-2 justify-center">
          {results.traits.map((trait) => (
            <span
              key={trait}
              className="px-3 py-1 border border-gray-700 rounded-full text-sm text-gray-400"
            >
              {trait}
            </span>
          ))}
        </div>

        {/* CTA */}
        <div className="flex gap-4 justify-center pt-4">
          <Link
            href="/quiz"
            className="text-sm text-gray-500 hover:text-white underline transition-colors"
          >
            Take it again
          </Link>
          <Link
            href="/"
            className="text-sm text-gray-500 hover:text-white underline transition-colors"
          >
            Home
          </Link>
        </div>
      </div>
    </main>
  )
}
