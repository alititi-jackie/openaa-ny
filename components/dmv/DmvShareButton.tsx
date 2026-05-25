'use client'

import { useState } from 'react'
import { detailActionButtonClass } from '@/components/detailActionButtonStyles'
import { getSiteUrl } from '@/lib/site'

type DmvShareButtonProps = {
  path: string
  title: string
  text: string
  className?: string
  label?: string
}

export default function DmvShareButton({ path, title, text, className, label = '📤 分享' }: DmvShareButtonProps) {
  const [shareToast, setShareToast] = useState('')

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
        setShareToast('链接已复制')
      } else {
        setShareToast('分享失败，请稍后重试')
      }
    } else {
      setShareToast('分享失败，请稍后重试')
    }

    setTimeout(() => setShareToast(''), 2000)
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
