'use client'

import { useState } from 'react'
import Image from 'next/image'

interface Props {
  src?: string | null
  alt: string
  className?: string
  sizes?: string
  priority?: boolean
}

const DEFAULT_NEWS_COVER_SIZES = '(min-width: 768px) 420px, 100vw'

function canUseNextImage(src: string) {
  if (src.startsWith('/')) return true
  try {
    const hostname = new URL(src).hostname
    return (
      hostname === 'img.openaa.com' ||
      hostname.endsWith('.supabase.co') ||
      hostname.endsWith('.googleusercontent.com')
    )
  } catch {
    return false
  }
}

function Fallback({ className }: { className?: string }) {
  const classes = `${className ?? ''} bg-gradient-to-br from-sky-100 to-blue-200 flex items-center justify-center`.trim()
  return (
    <div className={classes}>
      <span className="text-sm font-semibold text-blue-700">OpenAA 资讯</span>
    </div>
  )
}

export default function NewsCover({ src, alt, className, sizes = DEFAULT_NEWS_COVER_SIZES, priority = false }: Props) {
  const [broken, setBroken] = useState(false)
  const imageSrc = typeof src === 'string' ? src.trim() : ''
  const imageClasses = `${className ?? ''} object-cover bg-zinc-100`.trim()
  const wrapperClasses = `${className ?? ''} relative block overflow-hidden bg-zinc-100`.trim()

  if (!imageSrc || broken) return <Fallback className={className} />

  if (canUseNextImage(imageSrc)) {
    return (
      <span className={wrapperClasses}>
        <Image
          src={imageSrc}
          alt={alt}
          fill
          sizes={sizes}
          className="object-cover"
          onError={() => setBroken(true)}
          {...(priority ? { priority: true } : { loading: 'lazy' as const })}
        />
      </span>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imageSrc}
      alt={alt}
      onError={() => setBroken(true)}
      loading={priority ? 'eager' : 'lazy'}
      className={imageClasses}
    />
  )
}
