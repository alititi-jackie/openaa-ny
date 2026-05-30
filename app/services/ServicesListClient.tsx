'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import AppTopSection from '@/components/AppTopSection'
import HorizontalCategoryTabs from '@/components/HorizontalCategoryTabs'
import BackToTopButton from '@/components/BackToTopButton'
import DetailBackButton from '@/components/DetailBackButton'
import RegionFilter, { ALL_REGIONS } from '@/components/RegionFilter'
import ShareButton from '@/components/ShareButton'
import ChannelSeoSection from '@/components/ChannelSeoSection'
import type { ServicePost } from '@/types'

export const SERVICE_CATEGORIES = [
  '全部',
  '装修维修',
  '搬家运输',
  '家政清洁',
  '汽车相关',
  '专业服务',
  '电脑手机',
  '餐饮商业',
  '其它服务',
] as const

function formatDate(s: string | null) {
  if (!s) return ''
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

function toSortableTime(value: string | null | undefined): number {
  if (!value) return 0
  const time = new Date(value).getTime()
  return Number.isNaN(time) ? 0 : time
}

function isEffectivePinned(post: ServicePost, nowTime: number): boolean {
  if (!post.is_pinned) return false
  if (post.status !== 'active' && post.status !== 'published') return false
  if (!post.pinned_until) return true
  return toSortableTime(post.pinned_until) > nowTime
}

type ServicesApiResponse = {
  data?: ServicePost[]
  error?: string
}

function ServiceCard({ post }: { post: ServicePost }) {
  const thumb = post.images?.[0] ?? null
  const isPinned = isEffectivePinned(post, Date.now())
  return (
    <Link
      href={`/services/${post.id}`}
      className="block bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition"
    >
      {thumb ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumb} alt={post.title} className="w-full h-36 object-cover" />
      ) : (
        <div className="w-full h-36 bg-zinc-50 flex items-center justify-center text-3xl select-none" aria-hidden="true">
          🛠️
        </div>
      )}
      <div className="p-3">
        <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2">
          {post.title}
        </h3>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
          {isPinned ? (
            <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 border border-amber-100">
              置顶
            </span>
          ) : null}
          <span>{post.category}</span>
          <span>·</span>
          <span>{post.location}</span>
        </div>
        <p className="mt-1 text-xs text-gray-600 line-clamp-2">{post.description}</p>
        {post.price_note ? (
          <p className="mt-1 text-xs text-blue-600">{post.price_note}</p>
        ) : null}
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-gray-400">{formatDate(post.created_at)}</span>
          <span className="text-xs text-[#1976d2] font-medium">查看详情 →</span>
        </div>
      </div>
    </Link>
  )
}

export default function ServicesListClient() {
  const [posts, setPosts] = useState<ServicePost[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('全部')
  const [location, setLocation] = useState(ALL_REGIONS)

  const fetchPosts = useCallback(async () => {
    setLoading(true)
    const qs = new URLSearchParams({
      category,
      location,
      search,
    }).toString()
    try {
      const res = await fetch(`/api/services?${qs}`, { cache: 'no-store' })
      const json = (await res.json().catch(() => null)) as ServicesApiResponse | null
      if (!res.ok) {
        setPosts([])
        setLoading(false)
        return
      }

      setPosts(Array.isArray(json?.data) ? json.data : [])
      setLoading(false)
    } catch {
      setPosts([])
      setLoading(false)
    }
  }, [category, location, search])

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

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

  return (
    <div className="min-h-screen bg-zinc-50">
      <AppTopSection bannerPosition="services" />

      <div className="max-w-4xl mx-auto px-4 py-6 pb-24">
        <div className="mb-6 flex items-center justify-between gap-3">
          <DetailBackButton fallbackHref="/" label="← 返回首页" inToolbar forceHref />
          <ShareButton path="/services" title="OpenAA 本地服务" text="纽约华人常用本地服务信息与商家入口。" />
        </div>

        {/* Header */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-gray-900">本地服务</h1>
          <Link
            href="/services/publish"
            className="bg-[#1976d2] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#1565c0] transition"
          >
            {'+ \u53d1\u5e03\u670d\u52a1'}
          </Link>
        </div>
        <p className="mb-4 text-sm text-gray-500">
          找纽约华人常用服务：装修维修、搬家保洁、汽车驾校、律师会计、电脑手机等。
        </p>

        <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
          <div className="flex flex-col gap-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索服务标题、介绍、分类..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1976d2] focus:border-transparent"
            />
            <HorizontalCategoryTabs
              categories={SERVICE_CATEGORIES}
              activeCategory={category}
              onChange={setCategory}
              className="static top-auto z-auto mb-0 border-b-0 bg-transparent backdrop-blur-0 supports-[backdrop-filter]:bg-transparent"
            />
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <RegionFilter
                value={location}
                onChange={setLocation}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1976d2] focus:border-transparent sm:w-auto"
              />
            </div>
          </div>
        </div>

      {/* List */}
      <div>
        {loading ? (
          <div className="flex justify-center py-16 text-gray-400">加载中...</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
            <div className="text-4xl mb-3">🔍</div>
            <p className="font-medium text-gray-900">暂无相关信息</p>
            <p className="mt-2 text-sm text-gray-500">可以换个关键词或地区试试，也可以发布第一条信息。</p>
            <Link
              href="/services/publish"
              className="mt-4 inline-flex bg-[#1976d2] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#1565c0] transition"
            >
              发布服务
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filtered.map((post) => (
              <ServiceCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>

        <ChannelSeoSection
          className="mt-8"
          title="纽约华人服务频道介绍"
          paragraphs={[
            'OpenAA 本地服务频道聚焦纽约华人服务需求，覆盖搬家、装修、水电、家政、律师、会计、汽车维修等高频项目。很多用户搜索“纽约华人服务”时，希望先看到可执行的信息而不是分散广告，因此页面底部加入了完整正文，帮助搜索引擎和访客快速理解频道定位。',
            '本频道适合正在搬家换房、准备装修、需要临时上门维修、寻找长期家庭服务或咨询专业机构的用户。你可以先按分类筛选，再结合地区查看服务范围。比如在法拉盛需要当天上门水电检修，或在皇后区寻找可靠家政与会计服务，都可以先看近期发布与服务说明，再决定联系顺序。',
            'OpenAA 提供的是“按生活场景组织”的服务入口：信息展示更直观，支持关键词和区域过滤，减少在多个社群反复询问的时间。真实使用中，很多华人家庭会先筛出两到三家候选，再比较响应速度、报价说明和可服务时段；商家也能更精准触达本地有明确需求的客户，提高沟通效率。',
          ]}
          highlights={['适合用户：纽约华人家庭、新移民、需要本地上门服务或专业咨询的人群', '核心服务：搬家运输、装修维修、水电家政、律师会计、汽车与设备支持', '使用建议：先按分类和地区筛选，再联系确认报价、档期与服务边界']}
        />
      </div>

      <BackToTopButton />
    </div>
  )
}
