'use client'

import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
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
      <button
        type="button"
        onClick={handleClose}
        aria-label="关闭搜索"
        className="fixed top-16 right-4 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200 bg-white shadow-sm transition-colors active:bg-zinc-50"
      >
        <X size={20} className="text-zinc-700" />
      </button>
      <div className="w-full overflow-x-hidden px-4 pt-4 pr-14">
        <h1 className="mb-4 text-xl font-black text-zinc-900">OpenAA 站内搜索</h1>
        <SearchContent />
      </div>
    </>
  )
}
