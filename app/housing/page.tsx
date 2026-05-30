'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import AppTopSection from '@/components/AppTopSection'
import BackToTopButton from '@/components/BackToTopButton'
import DetailBackButton from '@/components/DetailBackButton'
import ShareButton from '@/components/ShareButton'
import RegionFilter, { ALL_REGIONS } from '@/components/RegionFilter'
import ChannelSeoSection from '@/components/ChannelSeoSection'
import type { HousingPost, HousingPostType } from '@/types'

const TABS: Array<{ key: HousingPostType; label: string }> = [
  { key: 'renting', label: '房源信息' },
  { key: 'seeking', label: '求租求购' },
]

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

function normalizeRoomType(value: string | null | undefined): string | null {
  const text = (value || '').trim()
  if (!text || text === '-' || text === '—') return null
  return text
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

      <div className="max-w-4xl mx-auto px-4 py-6 pb-24">
        <div className="mb-6 flex items-center justify-between gap-3">
          <DetailBackButton fallbackHref="/" label="← 返回首页" inToolbar forceHref />
          <ShareButton path="/housing" title="OpenAA 房屋租售频道" text="纽约房屋租售、求租求购信息频道。" />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h1 className="text-2xl font-bold text-gray-900">{pageTitle}</h1>
          <Link
            href={`/housing/publish?type=${activeTab}`}
            className="bg-[#1976d2] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#1565c0] transition"
          >
            + {publishLabel}
          </Link>
        </div>

        {/* Tabs */}
        <div className="mb-6 overflow-x-auto overflow-y-hidden py-1 [touch-action:pan-x] [overscroll-behavior-x:contain] [overscroll-behavior-y:contain]">
          <div className="inline-flex flex-nowrap rounded-xl bg-gray-100 p-1">
            {TABS.map((t) => {
              const isActive = t.key === activeTab
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setActiveTab(t.key)}
                  className={
                    isActive
                      ? 'inline-flex min-h-9 items-center rounded-lg bg-white px-4 py-2 text-sm font-semibold leading-none text-gray-900 shadow-sm'
                      : 'inline-flex min-h-9 items-center rounded-lg px-4 py-2 text-sm font-semibold leading-none text-gray-600 hover:text-gray-900'
                  }
                >
                  {t.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="mb-3 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={activeTab === 'renting' ? '搜索房源信息...' : '搜索求租信息...'}
            className="w-full flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1976d2] focus:border-transparent sm:min-w-[12rem]"
          />
          <RegionFilter
            value={location}
            onChange={setLocation}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1976d2] focus:border-transparent sm:w-auto"
          />
          </div>
        </div>

        {!!error && !loading && (
          <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            加载失败：{error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20 text-gray-500">加载中...</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
            <div className="text-4xl mb-3">🏠</div>
            <p className="font-medium text-gray-900">暂无相关信息</p>
            <p className="mt-2 text-sm text-gray-500">可以换个关键词或地区试试，也可以发布第一条信息。</p>
            <Link
              href="/housing/publish"
              className="inline-flex mt-4 bg-[#1976d2] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#1565c0] transition"
            >
              发布房屋
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((p) => {
              const priceStr = displayPrice(p.price)
              const isPinned = isEffectivePinned(p, Date.now())
              const roomType = normalizeRoomType(p.room_type)
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
                          <h3 className="font-semibold text-gray-900 line-clamp-2 max-w-[260px] sm:max-w-[520px]">
                            {p.title || (p.type === 'seeking' ? '求租' : '房屋出租')}
                          </h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${typeBadgeClass(p.type)}`}>
                            {typeLabel(p.type)}
                          </span>
                          {roomType ? (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-50 text-zinc-600 ring-1 ring-zinc-100">
                              {roomType}
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

        <ChannelSeoSection
          title="纽约租房与华人房屋信息指南"
          paragraphs={[
            'OpenAA 房屋频道围绕纽约租房和本地居住需求整理信息，覆盖法拉盛租房、皇后区租房、华人房屋出租、求租求购等高频场景。很多用户在通勤途中先看文字判断是否合适，所以页面底部提供了更完整的频道说明，帮助搜索引擎在图片尚未加载时也能抓取到清晰主题。',
            '这个频道适合准备换房的上班族、刚落地纽约的新移民、需要短租过渡的学生以及帮家人找房的用户。你可以在“房源信息”和“求租求购”之间切换，再结合搜索和地区筛选，快速缩小范围。比如你在法拉盛工作但想住在交通更方便的区域，先按皇后区租房筛一轮，再看预算与房型，效率会更高。',
            'OpenAA 提供的帮助不只是发布入口，还包括更接近日常决策的浏览方式：同类信息集中展示，价格、区域、发布时间一屏可对比。真实使用中，很多华人用户会在下班后统一看当日新帖，先收藏几个候选房源，再逐个沟通看房时间；房东也能更快触达本地有明确需求的租客，减少信息分散造成的沟通成本。',
          ]}
          highlights={['适合用户：纽约租房人群、法拉盛与皇后区通勤家庭、华人房东与租客', '核心功能：房源/求租切换、关键词与地区筛选、时间排序查看', '使用建议：先按区域和预算锁定范围，再联系确认租期、押金、入住日期']}
        />
      </div>
      <BackToTopButton />
    </div>
  )
}
