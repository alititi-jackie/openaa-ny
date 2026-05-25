'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import BackToTopButton from '@/components/BackToTopButton'
import DetailBackButton from '@/components/DetailBackButton'
import { supabase } from '@/lib/supabase'
import type { Favorite, FavoriteTargetType } from '@/types'

type CoreFavoriteType = Extract<FavoriteTargetType, 'jobs' | 'housing' | 'secondhand' | 'services' | 'news'>

const CORE_TYPES: CoreFavoriteType[] = ['jobs', 'housing', 'secondhand', 'services', 'news']

const TYPE_LABELS: Record<CoreFavoriteType, string> = {
  jobs: '招聘',
  housing: '房屋',
  secondhand: '二手',
  services: '服务',
  news: '新闻',
}

const TYPE_CLASS_NAMES: Record<CoreFavoriteType, string> = {
  jobs: 'bg-blue-50 text-blue-700 ring-blue-100',
  housing: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  secondhand: 'bg-amber-50 text-amber-700 ring-amber-100',
  services: 'bg-cyan-50 text-cyan-700 ring-cyan-100',
  news: 'bg-violet-50 text-violet-700 ring-violet-100',
}

const FILTERS: Array<{ value: 'all' | CoreFavoriteType; label: string }> = [
  { value: 'all', label: '全部' },
  { value: 'jobs', label: '招聘' },
  { value: 'housing', label: '房屋' },
  { value: 'secondhand', label: '二手' },
  { value: 'services', label: '服务' },
  { value: 'news', label: '新闻' },
]

function isCoreFavoriteType(value: FavoriteTargetType): value is CoreFavoriteType {
  return (CORE_TYPES as FavoriteTargetType[]).includes(value)
}

function formatCreatedAt(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function ProfileFavoritesPage() {
  const [items, setItems] = useState<Favorite[]>([])
  const [filter, setFilter] = useState<'all' | CoreFavoriteType>('all')
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function loadFavorites() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!mounted) return
      const token = session?.access_token ?? null
      setAccessToken(token)

      if (!token) {
        setLoading(false)
        return
      }

      const res = await fetch('/api/user/favorites', {
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => null)

      if (!mounted) return
      if (!res?.ok) {
        setErrorMessage('收藏加载失败，请稍后再试')
        setLoading(false)
        return
      }

      const json = (await res.json().catch(() => null)) as { data?: Favorite[] } | null
      setItems((json?.data ?? []).filter((item) => isCoreFavoriteType(item.target_type)))
      setLoading(false)
    }

    loadFavorites()
    return () => {
      mounted = false
    }
  }, [])

  const filteredItems = useMemo(() => {
    if (filter === 'all') return items
    return items.filter((item) => item.target_type === filter)
  }, [filter, items])

  const handleDelete = async (item: Favorite) => {
    if (!accessToken || deletingId) return
    setDeletingId(item.id)
    try {
      const res = await fetch(`/api/user/favorites/${item.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!res.ok) throw new Error('delete failed')
      setItems((current) => current.filter((favorite) => favorite.id !== item.id))
    } catch {
      setErrorMessage('取消收藏失败，请稍后再试')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 pb-24">
      <div className="mx-auto max-w-2xl px-4 py-6">
        <div className="mb-5">
          <DetailBackButton fallbackHref="/profile" label="← 返回我的" inToolbar forceHref />
        </div>

        <div className="mb-5 px-1">
          <h1 className="text-2xl font-black text-zinc-900">我的收藏</h1>
          <p className="mt-1 text-sm text-zinc-500">你收藏的内容会保存在账号中，登录后可在不同设备查看。</p>
        </div>

        {!accessToken && !loading ? (
          <div className="rounded-2xl border border-zinc-100 bg-white px-5 py-10 text-center shadow-sm">
            <p className="text-base font-bold text-zinc-900">请先登录后查看收藏</p>
            <p className="mt-1 text-sm text-zinc-500">登录后即可查看账号中保存的收藏内容</p>
            <Link
              href="/auth/login?redirect=/profile/favorites"
              className="mt-4 inline-flex rounded-xl bg-[#1976d2] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#1565c0]"
            >
              去登录
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
              {FILTERS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setFilter(item.value)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition ${
                    filter === item.value
                      ? 'bg-blue-600 text-white ring-blue-600'
                      : 'bg-white text-zinc-600 ring-zinc-200 hover:bg-zinc-50'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {errorMessage ? <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{errorMessage}</p> : null}

            {loading ? (
              <div className="rounded-2xl border border-zinc-100 bg-white px-5 py-10 text-center text-sm text-zinc-500 shadow-sm">
                加载中...
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="rounded-2xl border border-zinc-100 bg-white px-5 py-10 text-center shadow-sm">
                <p className="text-base font-bold text-zinc-900">暂无收藏</p>
                <p className="mt-1 text-sm text-zinc-500">去首页逛逛</p>
                <Link
                  href="/"
                  className="mt-4 inline-flex rounded-xl bg-[#1976d2] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#1565c0]"
                >
                  返回首页
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredItems.map((item) => {
                  const targetType = item.target_type as CoreFavoriteType
                  return (
                    <div key={item.id} className="rounded-2xl border border-zinc-100 bg-white p-3 shadow-sm">
                      <div className="flex gap-3">
                        {item.image_url ? (
                          <Link href={item.target_url} className="block h-20 w-24 shrink-0 overflow-hidden rounded-xl bg-zinc-100">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={item.image_url} alt={item.title} className="h-full w-full object-cover" />
                          </Link>
                        ) : (
                          <Link
                            href={item.target_url}
                            className="flex h-20 w-24 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-sm font-bold text-zinc-400"
                          >
                            {TYPE_LABELS[targetType]}
                          </Link>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${TYPE_CLASS_NAMES[targetType]}`}>
                              {TYPE_LABELS[targetType]}
                            </span>
                            <span className="text-xs text-zinc-400">{formatCreatedAt(item.created_at)}</span>
                          </div>
                          <Link href={item.target_url} className="mt-1 block">
                            <h2 className="line-clamp-2 text-sm font-bold leading-snug text-zinc-900">{item.title}</h2>
                            {item.summary ? <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-zinc-500">{item.summary}</p> : null}
                          </Link>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap justify-end gap-2">
                        <Link
                          href={item.target_url}
                          className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-100"
                        >
                          打开
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDelete(item)}
                          disabled={deletingId === item.id}
                          className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {deletingId === item.id ? '处理中' : '取消收藏'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
      <BackToTopButton />
    </div>
  )
}
