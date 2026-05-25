'use client'

import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { detailActionButtonClass } from '@/components/detailActionButtonStyles'
import { getSiteUrl } from '@/lib/site'

type ShareButtonProps = {
  path: string
  title: string
  text: string
  className?: string
  label?: ReactNode
}

export default function ShareButton({ path, title, text, className, label = '分享' }: ShareButtonProps) {
  const [shareToast, setShareToast] = useState('')
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    }
  }, [])

  const showToast = (message: string) => {
    setShareToast(message)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setShareToast(''), 2500)
  }

  const handleShare = async () => {
    if (typeof navigator === 'undefined') return

    const url = getSiteUrl(path)
    const shareData = { title, text, url }

    if (navigator.share) {
      const shared = await navigator.share(shareData).then(() => true).catch(() => false)
      if (shared) return
    }

    if (navigator.clipboard?.writeText) {
      const copied = await navigator.clipboard.writeText(url).then(() => true).catch(() => false)
      if (copied) {
        showToast('链接已复制，可以发送给朋友')
      } else {
        showToast('复制失败，请手动复制链接')
      }
    } else {
      showToast('复制失败，请手动复制链接')
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleShare}
        aria-label="分享当前页面"
        className={className ?? detailActionButtonClass}
      >
        {label}
      </button>
      {shareToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 left-1/2 -translate-x-1/2 rounded-xl bg-zinc-800 px-4 py-2 text-sm text-white z-50"
        >
          {shareToast}
        </div>
      )}
    </>
  )
}
