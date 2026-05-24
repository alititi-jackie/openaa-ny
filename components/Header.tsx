'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, MapPin, Search, Share2 } from 'lucide-react'
import { shareOpenAA } from '@/lib/share'
import GlobalSearchOverlay from './GlobalSearchOverlay'

type QuickNavItem = {
  id: string
  title: string
  url: string
  sort_order: number
  open_mode: 'same' | 'new'
}

const DEFAULT_QUICK_NAV_ITEMS: QuickNavItem[] = [
  { id: 'jobs', title: '招聘', url: '/jobs', sort_order: 10, open_mode: 'same' },
  { id: 'housing', title: '房屋', url: '/housing', sort_order: 20, open_mode: 'same' },
  { id: 'secondhand', title: '二手', url: '/secondhand', sort_order: 30, open_mode: 'same' },
  { id: 'services', title: '本地服务', url: '/services', sort_order: 40, open_mode: 'same' },
  { id: 'news', title: '新闻', url: '/news', sort_order: 50, open_mode: 'same' },
  { id: 'dmv', title: 'DMV', url: '/dmv', sort_order: 60, open_mode: 'same' },
  { id: 'navigation', title: '导航', url: '/navigation', sort_order: 70, open_mode: 'same' },
  { id: 'feedback', title: '反馈', url: '/feedback', sort_order: 80, open_mode: 'same' },
]

export default function Header() {
  const [quickNavItems, setQuickNavItems] = useState<QuickNavItem[]>(DEFAULT_QUICK_NAV_ITEMS)
  const [isQuickNavOpen, setIsQuickNavOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const touchStartRef = useRef<number | null>(null)
  const touchCurrentRef = useRef<number | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  const ChevronIcon = useMemo(() => (isQuickNavOpen ? ChevronUp : ChevronDown), [isQuickNavOpen])

  const updateScrollButtons = () => {
    const element = scrollRef.current
    if (!element) {
      setCanScrollLeft(false)
      setCanScrollRight(false)
      return
    }

    const maxScrollLeft = element.scrollWidth - element.clientWidth
    setCanScrollLeft(element.scrollLeft > 4)
    setCanScrollRight(element.scrollLeft < maxScrollLeft - 4)
  }

  useEffect(() => {
    if (!isQuickNavOpen) return

    updateScrollButtons()

    const element = scrollRef.current
    if (!element) return

    const handleScroll = () => updateScrollButtons()
    const handleResize = () => updateScrollButtons()

    element.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleResize)

    return () => {
      element.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleResize)
    }
  }, [isQuickNavOpen])

  useEffect(() => {
    const controller = new AbortController()

    async function fetchTopLinks() {
      try {
        const res = await fetch('/api/top-links', { signal: controller.signal })
        if (!res.ok) return

        const json: unknown = await res.json()
        if (
          json === null ||
          typeof json !== 'object' ||
          !('data' in json) ||
          !Array.isArray((json as Record<string, unknown>).data)
        ) {
          return
        }

        const data = (json as { data: unknown[] }).data
        const normalized = data
          .map((item): QuickNavItem | null => {
            if (item === null || typeof item !== 'object') return null
            const row = item as Record<string, unknown>
            const id = typeof row.id === 'string' ? row.id : ''
            const title = typeof row.title === 'string' ? row.title.trim() : ''
            const url = typeof row.url === 'string' ? row.url.trim() : ''
            const sort_order =
              typeof row.sort_order === 'number' && Number.isFinite(row.sort_order) ? Math.floor(row.sort_order) : 0
            const open_mode = row.open_mode === 'new' ? 'new' : 'same'
            if (!id || !title || !url || sort_order < 0) return null
            return { id, title, url, sort_order, open_mode }
          })
          .filter((item): item is QuickNavItem => item !== null)
          .sort((a, b) => a.sort_order - b.sort_order)

        if (normalized.length > 0) {
          setQuickNavItems(normalized)
        }
      } catch {
        // fallback to default quick nav items
      }
    }

    void fetchTopLinks()

    return () => {
      controller.abort()
    }
  }, [])

  const toggleQuickNav = () => {
    setIsQuickNavOpen((prev) => !prev)
  }

  const closeQuickNav = () => {
    setIsQuickNavOpen(false)
  }

  const handleQuickNavTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    touchStartRef.current = event.touches[0]?.clientY ?? null
    touchCurrentRef.current = touchStartRef.current
  }

  const handleQuickNavTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    touchCurrentRef.current = event.touches[0]?.clientY ?? null
  }

  const handleQuickNavTouchEnd = () => {
    if (touchStartRef.current !== null && touchCurrentRef.current !== null) {
      const deltaY = touchCurrentRef.current - touchStartRef.current
      if (deltaY <= -24) {
        closeQuickNav()
      }
    }

    touchStartRef.current = null
    touchCurrentRef.current = null
  }

  const scrollQuickNav = (left: number) => {
    scrollRef.current?.scrollBy({
      left,
      behavior: 'smooth',
    })
  }

  return (
    <>
      <header className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[560px] z-50 bg-white/96 backdrop-blur-md border-b border-zinc-100/80">
      <div className="relative">
        <div className="flex items-center justify-between h-14 px-4">
          {/* Left: location picker */}
          <button
            type="button"
            aria-expanded={isQuickNavOpen}
            aria-controls="header-quick-nav"
            className="flex items-center gap-1 text-sm font-semibold text-zinc-700 active:opacity-70 transition-opacity"
            onClick={toggleQuickNav}
          >
            <MapPin size={14} className="text-blue-500" />
            <span>纽约</span>
            <ChevronIcon size={16} strokeWidth={2.4} className="text-blue-500 mt-px" />
          </button>

          {/* Center: logo */}
          <Link
            href="/"
            className="absolute left-1/2 -translate-x-1/2 flex items-center select-none"
            aria-label="OpenAA 首页"
          >
            <Image
              src="/openaa-logo.png"
              alt="OpenAA"
              width={36}
              height={36}
              className="rounded-xl object-contain"
              priority
            />
            <span className="ml-1.5 font-extrabold text-[20px] tracking-tight leading-none">
              <span className="text-blue-500">Open</span>
              <span className="text-zinc-800">AA</span>
            </span>
          </Link>

          {/* Right: search + share */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label={isSearchOpen ? '关闭搜索' : '站内搜索'}
              aria-expanded={isSearchOpen}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-zinc-50 border border-zinc-100 active:bg-zinc-100 transition-colors"
              onClick={() => setIsSearchOpen((prev) => !prev)}
            >
              <Search size={22} className="text-zinc-600" />
            </button>
            <button
              type="button"
              aria-label="分享"
              className="w-9 h-9 flex items-center justify-center rounded-full bg-zinc-50 border border-zinc-100 active:bg-zinc-100 transition-colors"
              onClick={() => {
                void shareOpenAA()
              }}
            >
              <Share2 size={16} className="text-zinc-600" />
            </button>
          </div>
        </div>

        {isQuickNavOpen ? (
          <div
            id="header-quick-nav"
            className="border-t border-zinc-100/80 bg-white/95 px-3 py-2 shadow-[0_10px_24px_rgba(15,23,42,0.08)]"
            onTouchStart={handleQuickNavTouchStart}
            onTouchMove={handleQuickNavTouchMove}
            onTouchEnd={handleQuickNavTouchEnd}
          >
            <div className="relative md:px-2">
              <button
                type="button"
                aria-label="快捷导航向左滚动"
                onClick={() => scrollQuickNav(-180)}
                disabled={!canScrollLeft}
                className={`hidden md:flex absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 h-7 w-7 items-center justify-center rounded-full border border-zinc-200 bg-white shadow-[0_4px_12px_rgba(15,23,42,0.08)] transition-all ${
                  canScrollLeft ? 'text-zinc-500 hover:bg-zinc-50' : 'pointer-events-none text-zinc-300 opacity-40'
                }`}
              >
                <ChevronLeft size={15} />
              </button>

                <div
                  ref={scrollRef}
                  className="flex flex-nowrap gap-2 overflow-x-auto overflow-y-hidden whitespace-nowrap pb-1 [touch-action:pan-x] [overscroll-behavior-x:contain] [overscroll-behavior-y:contain] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                >
                  {quickNavItems.map((item) => (
                    <Link
                      key={item.id}
                      href={item.url}
                      target={item.open_mode === 'new' ? '_blank' : undefined}
                      rel={item.open_mode === 'new' ? 'noopener noreferrer' : undefined}
                      className="shrink-0 rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-100 active:bg-blue-100"
                      onClick={closeQuickNav}
                    >
                      {item.title}
                    </Link>
                  ))}
                </div>

              <button
                type="button"
                aria-label="快捷导航向右滚动"
                onClick={() => scrollQuickNav(180)}
                disabled={!canScrollRight}
                className={`hidden md:flex absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 z-10 h-7 w-7 items-center justify-center rounded-full border border-zinc-200 bg-white shadow-[0_4px_12px_rgba(15,23,42,0.08)] transition-all ${
                  canScrollRight ? 'text-zinc-500 hover:bg-zinc-50' : 'pointer-events-none text-zinc-300 opacity-40'
                }`}
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        ) : null}
      </div>
      </header>
      <GlobalSearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  )
}
