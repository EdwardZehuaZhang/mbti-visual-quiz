import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'MBTI Visual Quiz',
  description: 'Discover your personality type through intuitive visual choices',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-black text-white antialiased">
        {children}
      </body>
    </html>
  )
}
