'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import SearchContent from '@/components/SearchContent'

export default function SearchClient() {
  const router = useRouter()

  const handleClose = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
    } else {
      router.push('/')
    }
  }

  return (
    <>
      {/* Sticky top bar: back arrow (left) | title (center) */}
      <div className="sticky top-14 z-30 flex h-14 items-center border-b border-zinc-100 bg-white px-2">
        {/* Left: back arrow */}
        <button
          type="button"
          onClick={handleClose}
          aria-label="返回"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors active:bg-zinc-100"
        >
          <ChevronLeft size={22} className="text-zinc-700" />
        </button>

        {/* Center: title */}
        <h1 className="flex-1 truncate text-center text-base font-bold text-zinc-900">
          OpenAA 站内搜索
        </h1>

        {/* Right: spacer to balance the left button */}
        <div className="h-11 w-11 shrink-0" />
      </div>

      {/* Search content */}
      <div className="w-full overflow-x-hidden px-4 pt-4 pb-24">
        <SearchContent />

        {/* Bottom centered close button, above BottomNav */}
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={handleClose}
            aria-label="关闭搜索"
            className="rounded-full border border-zinc-200 bg-zinc-50 px-6 py-2 text-sm font-medium text-zinc-700 shadow-sm transition-colors active:bg-zinc-100"
          >
            关闭
          </button>
        </div>
      </div>
    </>
  )
}
