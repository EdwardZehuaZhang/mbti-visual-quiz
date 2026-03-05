'use client'

import Image from 'next/image'
import type { ImageItem } from '@/lib/types'

interface ImageGridProps {
  images: ImageItem[]
  onSelect: (image: ImageItem) => void
  disabled?: boolean
  selectedId?: string
}

export default function ImageGrid({ images, onSelect, disabled, selectedId }: ImageGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3 w-full max-w-2xl mx-auto">
      {images.map((image) => (
        <button
          key={image.id}
          onClick={() => !disabled && onSelect(image)}
          disabled={disabled}
          className={`
            relative aspect-square overflow-hidden rounded-xl
            transition-all duration-300 ease-in-out
            ${disabled ? 'cursor-not-allowed' : 'cursor-pointer hover:scale-[1.02] hover:shadow-xl'}
            ${selectedId === image.id ? 'ring-4 ring-white scale-[1.02] shadow-xl' : 'ring-0'}
            ${disabled && selectedId !== image.id ? 'opacity-50' : 'opacity-100'}
          `}
        >
          <Image
            src={image.url}
            alt={image.alt}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 50vw, 400px"
          />
          {selectedId === image.id && (
            <div className="absolute inset-0 bg-white/20 flex items-center justify-center">
              <span className="text-white text-4xl">&#10003;</span>
            </div>
          )}
        </button>
      ))}
    </div>
  )
}