'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Autoplay, Pagination } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/pagination'

type BannerPosition = 'home' | 'jobs' | 'secondhand' | 'navigation' | 'housing' | 'services' | 'news' | 'dmv'

interface Props {
  position?: BannerPosition
}

interface AdSlide {
  id: string
  image_url?: string | null
  link_url?: string | null
  link_type?: string | null
  external_url?: string | null
  slug?: string | null
  open_mode?: 'internal' | 'external_new' | 'external_same' | string | null
}

function normalizeImageUrl(v: unknown): string {
  if (typeof v === 'string' && v.trim()) return v.trim()
  return ''
}

const BANNER_IMAGE_SIZES = '(min-width: 1040px) 1040px, 100vw'

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

export default function BannerCarousel({ position = 'home' }: Props) {
  const [slides, setSlides] = useState<AdSlide[]>([])

  useEffect(() => {
    fetch(`/api/ads?position=${position}`)
      .then((res) => res.json())
      .then((json) => {
        if (Array.isArray(json.data) && json.data.length > 0) {
          const filtered = json.data.filter((s: AdSlide) => normalizeImageUrl(s?.image_url))
          setSlides(filtered)
        } else {
          setSlides([])
        }
      })
      .catch(() => {
        // keep empty on error (no broken fallback image requests)
        setSlides([])
      })
  }, [position])

  const renderSlideContent = (slide: AdSlide, index: number) => {
    const imageUrl = normalizeImageUrl(slide.image_url)
    const isFirstSlide = index === 0

    // If we somehow have no image url, render nothing (should not happen after filtering)
    if (!imageUrl) return null

    // Standardized ratio close to 3:1, recommended 1500x500
    const image = (
      <div className="relative w-full h-[160px] sm:h-[180px] md:h-[200px] bg-zinc-100">
        {canUseNextImage(imageUrl) ? (
          <Image
            src={imageUrl}
            alt=""
            fill
            sizes={BANNER_IMAGE_SIZES}
            className="object-cover select-none"
            draggable={false}
            {...(isFirstSlide ? { priority: true } : { loading: 'lazy' as const })}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt=""
            className="h-full w-full object-cover select-none"
            draggable={false}
            loading={isFirstSlide ? 'eager' : 'lazy'}
          />
        )}
      </div>
    )

    const href = (slide.external_url || slide.link_url || '').trim()
    const openMode = slide.open_mode || (slide.link_type === 'internal' ? 'internal' : 'external_new')

    if (openMode === 'internal' && slide.slug) {
      return (
        <Link href={`/ads/${slide.slug}`} className="block w-full">
          {image}
        </Link>
      )
    }

    if (openMode === 'external_new' && href) {
      return (
        <button
          type="button"
          className="block w-full text-left"
          onClick={() => window.open(href, '_blank', 'noopener,noreferrer')}
        >
          {image}
        </button>
      )
    }

    if (openMode === 'external_same' && href) {
      return (
        <button
          type="button"
          className="block w-full text-left"
          onClick={() => {
            window.location.href = href
          }}
        >
          {image}
        </button>
      )
    }

    // Back-compat fallbacks
    if (slide.link_type === 'internal' && slide.slug) {
      return (
        <Link href={`/ads/${slide.slug}`} className="block w-full">
          {image}
        </Link>
      )
    }

    if (href) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" className="block w-full">
          {image}
        </a>
      )
    }

    return image
  }

  // If API has no valid slides, render nothing (avoid broken default images)
  if (slides.length === 0) return null

  return (
    <div className="px-4 pt-4 relative">
      <div className="rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.12)] ring-1 ring-black/5 overflow-hidden bg-white">
        <Swiper
          modules={[Autoplay, Pagination]}
          loop={slides.length > 1}
          autoplay={{ delay: 4000, disableOnInteraction: false }}
          pagination={{ clickable: true }}
          touchRatio={1}
          className="banner-swiper"
        >
          {slides.map((slide, index) => (
            <SwiperSlide key={slide.id}>{renderSlideContent(slide, index)}</SwiperSlide>
          ))}
        </Swiper>
      </div>
    </div>
  )
}
