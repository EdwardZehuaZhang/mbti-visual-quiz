import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
      <div className="max-w-lg space-y-8">
        <div className="space-y-3">
          <h1 className="text-5xl font-light tracking-tight">
            MBTI Visual
          </h1>
          <p className="text-gray-400 text-lg font-light">
            Discover your personality type through images, not questions.
          </p>
        </div>

        <div className="text-gray-500 text-sm space-y-2 text-left border border-gray-800 rounded-xl p-5">
          <p>You will be shown scenes.</p>
          <p>Each scene has four images. Pick the one that resonates.</p>
          <p>There are no right answers — only your intuition.</p>
          <p>The quiz adapts as it learns your pattern.</p>
        </div>

        <Link
          href="/quiz"
          className="inline-block bg-white text-black font-medium px-8 py-3 rounded-full hover:bg-gray-100 transition-colors"
        >
          Begin
        </Link>
      </div>
    </main>
  )
}
