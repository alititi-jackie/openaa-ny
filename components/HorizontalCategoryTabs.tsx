'use client'

import { useRef } from 'react'
import Link from 'next/link'

interface Props {
  categories: readonly string[]
  activeCategory: string
  onChange?: (category: string) => void
  getHref?: (category: string) => string
  getLabel?: (category: string) => string
  className?: string
}

const SCROLL_DISTANCE = 200

function BaseTab({
  label,
  active,
  className,
}: {
  label: string
  active: boolean
  className?: string
}) {
  return (
    <span
      className={`${className ?? ''} flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium border transition ${
        active
          ? 'bg-[#1976d2] text-white border-[#1976d2]'
          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
      }`.trim()}
    >
      {label}
    </span>
  )
}

export default function HorizontalCategoryTabs({
  categories,
  activeCategory,
  onChange,
  getHref,
  getLabel,
  className,
}: Props) {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const first = categories[0]
  const rest = categories.slice(1)
  const containerClass = `sticky top-14 z-40 mb-2 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 border-b border-zinc-100 ${className ?? ''}`.trim()
  const resolveLabel = (category: string) => getLabel?.(category) ?? category

  return (
    <div className={containerClass}>
      <div className="flex items-center gap-2 px-4 py-2">
        {getHref ? (
          <Link href={getHref(first)} aria-current={activeCategory === first ? 'page' : undefined}>
            <BaseTab label={resolveLabel(first)} active={activeCategory === first} />
          </Link>
        ) : (
          <button type="button" onClick={() => onChange?.(first)}>
            <BaseTab label={resolveLabel(first)} active={activeCategory === first} />
          </button>
        )}

        <div className="min-w-0 flex-1 relative flex items-center">
          <button
            type="button"
            onClick={() => scrollRef.current?.scrollBy({ left: -SCROLL_DISTANCE, behavior: 'smooth' })}
            className="hidden md:flex flex-shrink-0 items-center justify-center w-6 h-6 rounded-full bg-white border border-gray-200 text-gray-500 shadow-sm hover:bg-gray-50 transition mr-1"
            aria-label="向左滚动"
          >
            ‹
          </button>

          <div
            ref={scrollRef}
            className="min-w-0 flex-1 overflow-x-auto overflow-y-hidden whitespace-nowrap [touch-action:pan-x] [overscroll-behavior-x:contain] [overscroll-behavior-y:contain] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            role="region"
            aria-label="分类筛选"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft') scrollRef.current?.scrollBy({ left: -SCROLL_DISTANCE, behavior: 'smooth' })
              if (e.key === 'ArrowRight') scrollRef.current?.scrollBy({ left: SCROLL_DISTANCE, behavior: 'smooth' })
            }}
          >
            <div className="flex flex-nowrap items-center gap-2">
              {rest.map((cat) => {
                const active = activeCategory === cat
                if (getHref) {
                  return (
                    <Link key={cat} href={getHref(cat)} aria-current={active ? 'page' : undefined}>
                      <BaseTab label={resolveLabel(cat)} active={active} />
                    </Link>
                  )
                }
                return (
                  <button key={cat} type="button" onClick={() => onChange?.(cat)}>
                    <BaseTab label={resolveLabel(cat)} active={active} />
                  </button>
                )
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={() => scrollRef.current?.scrollBy({ left: SCROLL_DISTANCE, behavior: 'smooth' })}
            className="hidden md:flex flex-shrink-0 items-center justify-center w-6 h-6 rounded-full bg-white border border-gray-200 text-gray-500 shadow-sm hover:bg-gray-50 transition ml-1"
            aria-label="向右滚动"
          >
            ›
          </button>
        </div>
      </div>
    </div>
  )
}
