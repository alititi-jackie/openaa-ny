'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import AppTopSection from '@/components/AppTopSection'
import SecondhandCard from '@/components/SecondhandCard'
import BackToTopButton from '@/components/BackToTopButton'
import DetailBackButton from '@/components/DetailBackButton'
import ShareButton from '@/components/ShareButton'
import { SECONDHAND_CATEGORIES } from '@/lib/constants'
import RegionFilter, { ALL_REGIONS } from '@/components/RegionFilter'
import ChannelSeoSection from '@/components/ChannelSeoSection'
import { LOCATION_OPTIONS } from '@/lib/locationOptions'
import { isPublicOwnerVisible } from '@/lib/publicVisibility'
import type { SecondhandItem, SecondhandItemType } from '@/types'

/** Extract the region from a secondhand item.
 * Selling items: "所在地区：{loc}" is prepended to description.
 * Buying items: same line is embedded in the structured description.
 * Some rows may also carry a top-level `location` field.
 */
function getItemRegion(item: SecondhandItem): string {
  const withLoc = item as SecondhandItem & { location?: string | null }
  if (withLoc.location && withLoc.location.trim()) return withLoc.location.trim()
  const lines = (item.description || '').split('\n')
  for (const line of lines) {
    const m = line.match(/^所在地区[:：]\s*(.+)\s*$/)
    const v = m?.[1]?.trim()
    if (v && (LOCATION_OPTIONS as readonly string[]).includes(v)) return v
  }
  return ''
}

const TABS: Array<{ key: SecondhandItemType; label: string }> = [
  { key: 'selling', label: '出售商品' },
  { key: 'buying', label: '求购信息' },
]

function toSortableTime(value: string | null | undefined): number {
  if (!value) return 0
  const time = new Date(value).getTime()
  return Number.isNaN(time) ? 0 : time
}

function isEffectivePinned(item: SecondhandItem, nowTime: number): boolean {
  if (!item.is_pinned) return false
  if (item.status !== 'published') return false
  if (!item.pinned_until) return true
  return toSortableTime(item.pinned_until) > nowTime
}

export default function SecondhandPage() {
  const [activeTab, setActiveTab] = useState<SecondhandItemType>('selling')
  const [items, setItems] = useState<SecondhandItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [location, setLocation] = useState(ALL_REGIONS)

  const fetchItems = useCallback(async () => {
    setLoading(true)

    // Note: 'type' is a new column; some environments might not have it yet.
    // We try applying the filter, and if it errors we fall back to the old query.
    const baseQuery = supabase
      .from('secondhand_items')
      .select('*, user:users(status)')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(50)

    let query = baseQuery
    query = query.eq('type', activeTab)

    if (category) query = query.eq('category', category)

    const { data, error } = await query
    if (!error) {
      setItems((data || []).filter((item) => isPublicOwnerVisible((item as SecondhandItem).user)) as SecondhandItem[])
      setLoading(false)
      return
    }

    // Fallback: ignore type filter (for older DB without the column)
    let fallback = baseQuery
    if (category) fallback = fallback.eq('category', category)

    const { data: fallbackData } = await fallback
    setItems(
      ((fallbackData || []) as SecondhandItem[]).filter((item) => isPublicOwnerVisible(item.user))
    )
    setLoading(false)
  }, [activeTab, category])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  const filtered = useMemo(() => {
    const searchLower = search.toLowerCase()
    const nowTime = Date.now()
    return items
      .filter((item) =>
        (!search || item.title.toLowerCase().includes(searchLower)) &&
        (location === ALL_REGIONS || getItemRegion(item) === location)
      )
      .sort((a, b) => {
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
  }, [items, search, location])

  const pageTitle = activeTab === 'selling' ? '二手交易' : '求购信息'
  const publishLabel = activeTab === 'selling' ? '发布商品' : '发布求购'

  return (
    <div className="min-h-screen bg-zinc-50">
      <AppTopSection bannerPosition="secondhand" />

      <div className="max-w-6xl mx-auto px-4 py-6 pb-24">
        <div className="mb-6 flex items-center justify-between gap-3">
          <DetailBackButton fallbackHref="/" label="← 返回首页" inToolbar forceHref />
          <ShareButton path="/secondhand" title="OpenAA 二手交易频道" text="纽约二手交易、求购信息与本地闲置发布。" />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h1 className="text-2xl font-bold text-gray-900">{pageTitle}</h1>
          <Link
            href={`/secondhand/publish?type=${activeTab}`}
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

        <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={activeTab === 'selling' ? '搜索商品...' : '搜索求购...'}
            className="w-full flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1976d2] focus:border-transparent sm:min-w-[12rem]"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1976d2] focus:border-transparent sm:w-auto"
          >
            <option value="">不限</option>
            {SECONDHAND_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <RegionFilter
            value={location}
            onChange={setLocation}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1976d2] focus:border-transparent sm:w-auto"
          />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">加载中...</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
            <div className="text-4xl mb-3">🛍️</div>
            <p className="font-medium text-gray-900">暂无相关信息</p>
            <p className="mt-2 text-sm text-gray-500">可以换个关键词或地区试试，也可以发布第一条信息。</p>
            <Link
              href="/secondhand/publish"
              className="mt-4 inline-flex bg-[#1976d2] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#1565c0] transition"
            >
              发布二手
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((item) => (
              <SecondhandCard key={item.id} item={item} />
            ))}
          </div>
        )}

        <ChannelSeoSection
          title="纽约华人二手交易频道使用说明"
          paragraphs={[
            'OpenAA 二手频道聚焦纽约二手与本地闲置流通，覆盖华人二手交易、家具家电转让、母婴用品、搬家清仓与长期求购等需求。相比零散群聊信息，这里把二手买卖集中到统一页面，搜索引擎也能通过完整正文更好识别频道主题，即使图片加载较慢，核心内容依然可读。',
            '适合使用的人群包括准备搬家的家庭、预算有限的留学生、刚入住新房需要补齐家具家电的租客，以及想快速处理闲置物品的卖家。你可以先在“出售商品”和“求购信息”之间切换，再按分类和地区筛选。比如在法拉盛短租到期前，需要快速出手桌椅和小家电，就可以优先发布本地区信息，减少跨区沟通成本。',
            'OpenAA 在频道里提供的是贴近真实交易流程的功能：发布内容清晰、浏览列表直观、发布时间可追踪。很多华人用户会先看最近两三天的帖子，再结合区域判断是否方便自取；买家也可以通过关键词直接查找“沙发”“冰箱”“婴儿床”等高频品类，提升配对效率。这样无论你是处理闲置还是补齐生活用品，都能更快找到匹配对象。',
          ]}
          highlights={['适合用户：纽约华人家庭、留学生、搬家换房人群', '核心功能：出售/求购切换、分类筛选、地区筛选、快速查看最新发布', '典型场景：法拉盛和皇后区本地自取交易、家具家电集中转让与补货']}
        />
      </div>
      <BackToTopButton />
    </div>
  )
}
