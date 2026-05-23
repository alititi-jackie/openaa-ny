'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import AppTopSection from '@/components/AppTopSection'
import BackToTopButton from '@/components/BackToTopButton'
import RegionFilter, { ALL_REGIONS } from '@/components/RegionFilter'
import type { HousingPost, HousingPostType } from '@/types'

const TABS: Array<{ key: HousingPostType; label: string }> = [
  { key: 'renting', label: '房源信息' },
  { key: 'seeking', label: '求租求购' },
]

function formatDate(s: string) {
  try {
    return new Date(s).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  } catch {
    return s
  }
}

function typeLabel(t?: string) {
  return t === 'seeking' ? '求租' : '出租'
}

function typeBadgeClass(t?: string) {
  return t === 'seeking'
    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'
    : 'bg-blue-50 text-blue-700 ring-1 ring-blue-100'
}

function displayPrice(p: number): string | null {
  const price = Number(p || 0)
  if (!Number.isFinite(price) || price <= 0) return null
  return `$${price}`
}

function toSortableTime(value: string | null | undefined): number {
  if (!value) return 0
  const time = new Date(value).getTime()
  return Number.isNaN(time) ? 0 : time
}

function isVisibleHousingStatus(status: string | null | undefined) {
  return status === 'published' || status === 'active'
}

function isEffectivePinned(post: HousingPost, nowTime: number): boolean {
  if (!post.is_pinned) return false
  // compatible with legacy status values in some environments
  if (!isVisibleHousingStatus(post.status)) return false
  if (!post.pinned_until) return true
  return toSortableTime(post.pinned_until) > nowTime
}

function normalizeTypeRow(t: unknown, fallback: HousingPostType): HousingPostType {
  const v = typeof t === 'string' ? t.trim().toLowerCase() : ''
  if (v === 'seeking' || v === 'seek' || v === 'wanted' || v === '求租' || v === '求购') return 'seeking'
  if (
    v === 'renting' ||
    v === 'rent' ||
    v === '出租' ||
    v === '出售' ||
    v === 'sale' ||
    v === 'sell' ||
    v === 'rent_out' ||
    v === 'rentout'
  )
    return 'renting'
  return fallback
}

type HousingApiResponse = {
  data?: unknown
  error?: string
}

function safeArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function encodeQuery(value: string): string {
  return encodeURIComponent(value)
}

export default function HousingPage() {
  const [activeTab, setActiveTab] = useState<HousingPostType>('renting')
  const [posts, setPosts] = useState<HousingPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [search, setSearch] = useState('')
  const [location, setLocation] = useState(ALL_REGIONS)

  const fetchPosts = useCallback(async () => {
    setLoading(true)
    setError('')

    const qs = `type=${encodeQuery(activeTab)}&location=${encodeQuery(location)}&search=${encodeQuery(search)}&limit=50`

    try {
      const res = await fetch(`/api/housing?${qs}`, { cache: 'no-store' })
      const json = (await res.json().catch(() => null)) as HousingApiResponse | null

      if (!res.ok) {
        setPosts([])
        setError(json?.error || `请求失败 (${res.status})`)
        setLoading(false)
        return
      }

      const raw = safeArray(json?.data)
      const normalized = raw
        .map((row) => row as Partial<HousingPost>)
        .filter((row) => typeof row.id === 'number' || typeof row.id === 'string')
        .map((row) => {
          const p = row as HousingPost
          return {
            ...p,
            type: normalizeTypeRow((row as { type?: unknown }).type, activeTab),
          }
        })

      setPosts(normalized)
      setLoading(false)
    } catch (e) {
      setPosts([])
      setError(e instanceof Error ? e.message : '请求失败')
      setLoading(false)
    }
  }, [activeTab, location, search])

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  // API already filters by type/location/search.
  // Keep only sorting on client to preserve existing UI behavior.
  const filtered = useMemo(() => {
    const nowTime = Date.now()
    return [...posts].sort((a, b) => {
      const aPinned = isEffectivePinned(a, nowTime)
      const bPinned = isEffectivePinned(b, nowTime)
      if (aPinned !== bPinned) return aPinned ? -1 : 1

      if (aPinned && bPinned) {
        const pinnedOrderDiff = (a.pinned_order ?? 0) - (b.pinned_order ?? 0)
        if (pinnedOrderDiff !== 0) return pinnedOrderDiff

        const createdAtDiff = toSortableTime(b.created_at) - toSortableTime(a.created_at)
        if (createdAtDiff !== 0) return createdAtDiff
      }

      return toSortableTime(b.created_at) - toSortableTime(a.created_at)
    })
  }, [posts])

  const pageTitle = activeTab === 'renting' ? '房屋租售' : '求租求购'
  const publishLabel = activeTab === 'renting' ? '发布房源' : '发布求租'

  return (
    <div className="min-h-screen bg-zinc-50">
      <AppTopSection bannerPosition="housing" />

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">{pageTitle}</h1>
          <Link
            href={`/housing/publish?type=${activeTab}`}
            className="bg-[#1976d2] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#1565c0] transition"
          >
            + {publishLabel}
          </Link>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="inline-flex rounded-xl bg-gray-100 p-1">
            {TABS.map((t) => {
              const isActive = t.key === activeTab
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setActiveTab(t.key)}
                  className={
                    isActive
                      ? 'px-4 py-2 text-sm font-semibold rounded-lg bg-white text-gray-900 shadow-sm'
                      : 'px-4 py-2 text-sm font-semibold rounded-lg text-gray-600 hover:text-gray-900'
                  }
                >
                  {t.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mb-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={activeTab === 'renting' ? '搜索房源信息...' : '搜索求租信息...'}
            className="flex-1 min-w-[12rem] border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1976d2] focus:border-transparent"
          />
          <RegionFilter value={location} onChange={setLocation} />
        </div>

        {!!error && !loading && (
          <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            加载失败：{error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20 text-gray-500">加载中...</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <div className="text-4xl mb-3">🏠</div>
            <p className="text-gray-700 font-medium">暂无符合条件的房屋信息</p>
            <Link
              href={`/housing/publish?type=${activeTab}`}
              className="inline-flex mt-4 bg-[#1976d2] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#1565c0] transition"
            >
              去发布
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((p) => {
              const priceStr = displayPrice(p.price)
              const isPinned = isEffectivePinned(p, Date.now())
              return (
                <Link
                  key={p.id}
                  href={`/housing/${p.id}`}
                  className="block rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden hover:bg-zinc-50 transition"
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-gray-900 truncate max-w-[260px] sm:max-w-[520px]">
                            {p.title || (p.type === 'seeking' ? '求租' : '房屋出租')}
                          </h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${typeBadgeClass(p.type)}`}>
                            {typeLabel(p.type)}
                          </span>
                          {p.room_type ? (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-50 text-zinc-600 ring-1 ring-zinc-100">
                              {p.room_type}
                            </span>
                          ) : null}
                        </div>

                        <div className="mt-2 text-sm text-gray-600 flex flex-wrap gap-x-4 gap-y-1">
                          {isPinned ? (
                            <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 border border-amber-100">
                              置顶
                            </span>
                          ) : null}
                          {priceStr ? <span>💰 {priceStr}</span> : null}
                          {p.location ? <span>📍 {p.location}</span> : null}
                          <span>🕒 {formatDate(p.created_at)}</span>
                        </div>

                        {p.description ? (
                          <p className="mt-3 text-sm text-gray-600 line-clamp-2 whitespace-pre-wrap">
                            {p.description}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
      <BackToTopButton />
    </div>
  )
}
