'use client'

import { Heart } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Favorite, FavoriteTargetType } from '@/types'

type FavoriteButtonProps = {
  targetType: FavoriteTargetType
  targetId: string | number
  targetUrl: string
  title: string
  imageUrl?: string
  summary?: string
  className?: string
}

const defaultClassName =
  'shrink-0 rounded-xl border border-blue-200 bg-white px-3 py-1.5 text-sm font-medium text-blue-600 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60'

function normalizeOptionalText(value?: string) {
  const text = value?.trim()
  return text || undefined
}

export default function FavoriteButton({
  targetType,
  targetId,
  targetUrl,
  title,
  imageUrl,
  summary,
  className,
}: FavoriteButtonProps) {
  const [favorite, setFavorite] = useState<Favorite | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState('')
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const targetIdText = String(targetId)

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    }
  }, [])

  useEffect(() => {
    let mounted = true

    async function loadFavoriteState() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!mounted) return
      const token = session?.access_token ?? null
      setAccessToken(token)
      if (!token) {
        setFavorite(null)
        return
      }

      const res = await fetch(`/api/user/favorites?target_type=${targetType}`, {
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => null)

      if (!mounted || !res?.ok) return
      const json = (await res.json().catch(() => null)) as { data?: Favorite[] } | null
      const match = json?.data?.find((item) => item.target_id === targetIdText) ?? null
      setFavorite(match)
    }

    loadFavoriteState()
    return () => {
      mounted = false
    }
  }, [targetIdText, targetType])

  const showToast = (message: string) => {
    setToast(message)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToast(''), 2500)
  }

  const handleClick = async () => {
    if (loading) return
    if (!accessToken) {
      showToast('请先登录后收藏')
      return
    }

    setLoading(true)
    try {
      if (favorite) {
        const res = await fetch(`/api/user/favorites/${favorite.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` },
        })
        if (!res.ok) throw new Error('delete failed')
        setFavorite(null)
        showToast('已取消收藏')
        return
      }

      const res = await fetch('/api/user/favorites', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target_type: targetType,
          target_id: targetIdText,
          target_url: targetUrl,
          title,
          image_url: normalizeOptionalText(imageUrl),
          summary: normalizeOptionalText(summary),
        }),
      })
      if (!res.ok) throw new Error('create failed')
      const json = (await res.json()) as { data: Favorite }
      setFavorite(json.data)
      showToast('已收藏')
    } catch {
      showToast('操作失败，请稍后再试')
    } finally {
      setLoading(false)
    }
  }

  const isFavorited = Boolean(favorite)

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        aria-label={isFavorited ? '取消收藏' : '收藏'}
        aria-pressed={isFavorited}
        className={className ?? defaultClassName}
      >
        <span className="inline-flex items-center gap-1.5">
          <Heart size={15} className={isFavorited ? 'fill-blue-600 text-blue-600' : 'text-blue-600'} aria-hidden="true" />
          <span>{loading ? '处理中' : isFavorited ? '已收藏' : '收藏'}</span>
        </span>
      </button>
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-zinc-800 px-4 py-2 text-sm text-white"
        >
          {toast}
        </div>
      )}
    </>
  )
}
