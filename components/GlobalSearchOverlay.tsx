'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronUp } from 'lucide-react'
import SearchContent from './SearchContent'

const BACK_TO_TOP_THRESHOLD = 500
// Matches the bottom nav bar height so the button sits just above it
const BACK_TO_TOP_BOTTOM = '88px'

interface GlobalSearchOverlayProps {
  isOpen: boolean
  onClose: () => void
}

export default function GlobalSearchOverlay({ isOpen, onClose }: GlobalSearchOverlayProps) {
  const [mounted, setMounted] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showBackToTop, setShowBackToTop] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el || !isOpen) return

    let rafId: number | null = null
    const handleScroll = () => {
      if (rafId !== null) return
      rafId = requestAnimationFrame(() => {
        setShowBackToTop(el.scrollTop > BACK_TO_TOP_THRESHOLD)
        rafId = null
      })
    }
    el.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      el.removeEventListener('scroll', handleScroll)
      if (rafId !== null) cancelAnimationFrame(rafId)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) {
      setShowBackToTop(false)
      if (scrollRef.current) {
        scrollRef.current.scrollTop = 0
      }
    }
  }, [isOpen])

  const scrollToTop = () => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (!mounted || !isOpen) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[100] overflow-x-hidden"
      style={{ height: '100dvh' }}
    >
      <div className="mx-auto flex h-full w-full max-w-[560px] flex-col bg-white md:max-w-[760px] lg:max-w-[960px] xl:max-w-[1040px]">
        {/* Top bar: back button + title */}
        <div className="shrink-0 border-b border-zinc-100 bg-white pt-[env(safe-area-inset-top)]">
          <div className="flex h-14 items-center px-4">
            <button
              type="button"
              onClick={onClose}
              aria-label="关闭搜索"
              className="flex items-center justify-center w-9 h-9 rounded-full active:bg-zinc-100 transition-colors mr-2 shrink-0"
            >
              <ChevronLeft size={22} className="text-zinc-700" />
            </button>
            <h2 className="truncate whitespace-nowrap text-base font-bold text-zinc-900">OpenAA 站内搜索</h2>
          </div>
        </div>

        {/* Scrollable content area */}
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          <div className="px-4">
            <SearchContent autoFocus onResultClick={onClose} />
          </div>
          {/* Bottom padding so content clears the mobile nav bar */}
          <div className="h-20" />
        </div>
      </div>

      {/* Back to top — positioned inside the overlay panel */}
      {showBackToTop && (
        <div className="pointer-events-none absolute inset-x-0 z-10" style={{ bottom: BACK_TO_TOP_BOTTOM }}>
          <div className="mx-auto flex w-full max-w-[560px] justify-end px-4 md:max-w-[760px] lg:max-w-[960px] xl:max-w-[1040px]">
            <button
              type="button"
              onClick={scrollToTop}
              aria-label="回到顶部"
              className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full border border-blue-100 bg-white shadow-md text-blue-600"
            >
              <ChevronUp size={22} />
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={onClose}
        aria-label="关闭"
        className="fixed bottom-20 left-1/2 z-[120] -translate-x-1/2 rounded-full border border-zinc-200 bg-white px-6 py-2 text-sm font-medium text-zinc-700 shadow-md active:bg-zinc-100 md:left-auto md:right-[calc((100vw-760px)/2+16px)] md:translate-x-0 lg:right-[calc((100vw-960px)/2+16px)] xl:right-[calc((100vw-1040px)/2+16px)]"
      >
        关闭
      </button>
    </div>,
    document.body,
  )
}
