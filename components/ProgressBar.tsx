'use client'

interface ProgressBarProps {
  turn: number
  maxTurns: number
  confidence: { EI: number; SN: number; TF: number; JP: number }
}

export default function ProgressBar({ turn, maxTurns, confidence }: ProgressBarProps) {
  const axes = ['EI', 'SN', 'TF', 'JP'] as const
  const avgConfidence = axes.reduce((sum, ax) => sum + confidence[ax], 0) / 4
  const progress = Math.max((turn / maxTurns) * 100, avgConfidence * 100)

  return (
    <div className="w-full max-w-2xl mx-auto space-y-2">
      <div className="flex justify-between text-xs text-gray-400">
        <span>Turn {turn} / {maxTurns}</span>
        <span>{Math.round(avgConfidence * 100)}% confident</span>
      </div>
      <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-white rounded-full transition-all duration-500"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
      <div className="grid grid-cols-4 gap-1">
        {axes.map((ax) => (
          <div key={ax} className="text-center">
            <div className="text-xs text-gray-500 mb-0.5">{ax}</div>
            <div className="h-0.5 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gray-400 rounded-full transition-all duration-500"
                style={{ width: `${confidence[ax] * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
