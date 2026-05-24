import Link from 'next/link'
import { MapPin, ChevronRight, Clock } from 'lucide-react'
import { isPublicOwnerVisible } from '@/lib/publicVisibility'
import { formatJobLocation } from '@/lib/utils'
import {
  DEFAULT_HOME_LATEST_SECTIONS,
  MAIN_SECTION_ROUTE,
  NEWS_CATEGORY_BY_SECTION_KEY,
  type HomeLatestSection,
} from '@/lib/homeSections'
import { getPublicSupabaseServerClient, getServiceSupabaseServerClient } from '@/lib/serverSupabase'
import { SITE_URL } from '@/lib/site'

type LatestJob = {
  id: string | number
  title: string | null
  location: string | null
  created_at?: string | null
  is_pinned?: boolean
  pinned_until?: string | null
  user?: { status?: unknown } | null
}

type LatestSecondhand = {
  id: string | number
  title: string | null
  category?: string | null
  created_at?: string | null
  is_pinned?: boolean
  pinned_until?: string | null
  user?: { status?: unknown } | null
}

type LatestHousing = {
  id: string | number
  title: string | null
  location: string | null
  created_at?: string | null
  is_pinned?: boolean
  pinned_until?: string | null
  user?: { status?: unknown } | null
}

type LatestService = {
  id: string
  title: string | null
  category: string | null
  location: string | null
  description: string | null
  images: string[] | null
  created_at?: string | null
  is_pinned?: boolean
  pinned_until?: string | null
  user?: { status?: unknown } | null
}

type LatestNews = {
  id: string
  slug: string | null
  title: string
  category: string
  summary: string | null
  content: string
  created_at: string
  published_at: string | null
  is_pinned?: boolean
  pinned_until?: string | null
}

function toSortableTime(value: string | null | undefined): number {
  if (!value) return 0
  const time = new Date(value).getTime()
  return Number.isNaN(time) ? 0 : time
}

function isPinnedActive(item: { is_pinned?: boolean; pinned_until?: string | null }, nowTime: number): boolean {
  if (!item.is_pinned) return false
  if (!item.pinned_until) return true
  return toSortableTime(item.pinned_until) > nowTime
}

function formatNewsDate(value: string | null | undefined) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}/${mm}/${dd}`
}

function getNewsSummary(item: LatestNews) {
  if (item.summary && item.summary.trim()) return item.summary.trim()
  const plain = item.content
    .replace(/[#*_`>\-\[\]\(\)]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!plain) return '更多内容正在整理中'
  return plain.length > 60 ? `${plain.slice(0, 60)}...` : plain
}

function asValidSections(rows: unknown): HomeLatestSection[] {
  if (!Array.isArray(rows)) return []
  return rows
    .map((row) => row as Partial<HomeLatestSection>)
    .filter(
      (row): row is HomeLatestSection =>
        typeof row.section_key === 'string' &&
        typeof row.section_name === 'string' &&
        (row.section_type === 'main' || row.section_type === 'news_category') &&
        typeof row.is_visible === 'boolean' &&
        typeof row.display_order === 'number' &&
        Number.isInteger(row.display_order) &&
        row.display_order >= 0 &&
        typeof row.limit_count === 'number' &&
        Number.isInteger(row.limit_count) &&
        row.limit_count >= 1 &&
        row.limit_count <= 30
    )
    .sort((a, b) => a.display_order - b.display_order)
}

async function getHomeLatestSections() {
  const supabase = getServiceSupabaseServerClient()
  if (!supabase) return DEFAULT_HOME_LATEST_SECTIONS

  const { data, error } = await supabase
    .from('home_latest_sections')
    .select('section_key, section_name, section_type, parent_key, is_visible, display_order, limit_count')
    .eq('is_visible', true)
    .order('display_order', { ascending: true })
    .order('section_key', { ascending: true })

  if (error) {
    console.error('Failed to load homepage latest sections:', error)
    return DEFAULT_HOME_LATEST_SECTIONS
  }

  const sections = asValidSections(data)
  return sections.length > 0 ? sections : DEFAULT_HOME_LATEST_SECTIONS
}

async function fetchPinnedFirst<T extends { id: string | number }>(
  pinnedQuery: PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  normalQuery: PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  limit: number
) {
  const [pinnedRes, normalRes] = await Promise.all([pinnedQuery, normalQuery])
  if (pinnedRes.error && normalRes.error) return [] as T[]

  const merged: T[] = []
  const seen = new Set<string>()

  for (const row of [...(pinnedRes.data ?? []), ...(normalRes.data ?? [])]) {
    const key = String(row.id)
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(row)
    if (merged.length >= limit) break
  }

  return merged.slice(0, limit)
}

async function getLatestPostsData() {
  const sections = await getHomeLatestSections()
  const supabase = getPublicSupabaseServerClient()

  if (!supabase) {
    return {
      sections,
      jobs: [] as LatestJob[],
      items: [] as LatestSecondhand[],
      housings: [] as LatestHousing[],
      services: [] as LatestService[],
      news: [] as LatestNews[],
    }
  }

  const sectionMap = new Map(sections.map((section) => [section.section_key, section]))
  const nowIso = new Date().toISOString()
  const nowTime = Date.now()

  const mainLimit = (key: string, fallback: number) => {
    const value = sectionMap.get(key)?.limit_count
    return typeof value === 'number' && value > 0 ? Math.min(30, value) : fallback
  }

  const [jobsData, housingsData, secondhandData, servicesData] = await Promise.all([
    sectionMap.get('latest_jobs')?.is_visible
      ? fetchPinnedFirst(
          supabase
            .from('job_postings')
            .select('id, title, location, created_at, is_pinned, pinned_until, user:users(status)')
            .eq('status', 'published')
            .eq('is_pinned', true)
            .or(`pinned_until.is.null,pinned_until.gt.${nowIso}`)
            .order('pinned_order', { ascending: true })
            .order('created_at', { ascending: false })
            .limit(30),
          supabase
            .from('job_postings')
            .select('id, title, location, created_at, is_pinned, pinned_until, user:users(status)')
            .eq('status', 'published')
            .order('created_at', { ascending: false })
            .limit(30),
          mainLimit('latest_jobs', 6)
        )
      : Promise.resolve([]),
    sectionMap.get('latest_housing')?.is_visible
      ? fetch(`${SITE_URL}/api/housing?limit=${mainLimit('latest_housing', 6)}`, { cache: 'no-store' })
          .then((r) => (r.ok ? r.json() : { data: [] }))
          .then((json: { data?: unknown[] }) => (Array.isArray(json?.data) ? json.data : []) as LatestHousing[])
          .catch(() => [] as LatestHousing[])
      : Promise.resolve([] as LatestHousing[]),
    sectionMap.get('latest_secondhand')?.is_visible
      ? fetchPinnedFirst(
          supabase
            .from('secondhand_items')
            .select('id, title, category, created_at, is_pinned, pinned_until, user:users(status)')
            .eq('status', 'published')
            .eq('is_pinned', true)
            .or(`pinned_until.is.null,pinned_until.gt.${nowIso}`)
            .order('pinned_order', { ascending: true })
            .order('created_at', { ascending: false })
            .limit(30),
          supabase
            .from('secondhand_items')
            .select('id, title, category, created_at, is_pinned, pinned_until, user:users(status)')
            .eq('status', 'published')
            .order('created_at', { ascending: false })
            .limit(30),
          mainLimit('latest_secondhand', 6)
        )
      : Promise.resolve([]),
    sectionMap.get('latest_services')?.is_visible
      ? fetch(`${SITE_URL}/api/services`, { cache: 'no-store' })
          .then((r) => (r.ok ? r.json() : { data: [] }))
          .then((json: { data?: unknown[] }) =>
            (Array.isArray(json?.data) ? json.data : []).slice(0, mainLimit('latest_services', 6)) as LatestService[]
          )
          .catch(() => [] as LatestService[])
      : Promise.resolve([] as LatestService[]),
  ])

  const latestNewsVisible = sectionMap.get('latest_news')?.is_visible === true
  const latestNewsLimit = mainLimit('latest_news', 15)
  const newsCategorySections = sections
    .filter(
      (section) =>
        section.section_type === 'news_category' &&
        section.parent_key === 'latest_news' &&
        section.is_visible
    )
    .sort((a, b) => a.display_order - b.display_order)

  const newsByCategory = latestNewsVisible
    ? await Promise.all(
        newsCategorySections.map(async (categorySection) => {
          const category = NEWS_CATEGORY_BY_SECTION_KEY[categorySection.section_key]
          if (!category) return [] as LatestNews[]

          return fetchPinnedFirst(
            supabase
              .from('news_posts')
              .select(
                'id, slug, title, category, summary, content, created_at, published_at, is_pinned, pinned_until'
              )
              .eq('is_published', true)
              .eq('category', category)
              .eq('is_pinned', true)
              .or(`pinned_until.is.null,pinned_until.gt.${nowIso}`)
              .order('pinned_order', { ascending: true })
              .order('published_at', { ascending: false, nullsFirst: false })
              .order('created_at', { ascending: false })
              .limit(30),
            supabase
              .from('news_posts')
              .select(
                'id, slug, title, category, summary, content, created_at, published_at, is_pinned, pinned_until'
              )
              .eq('is_published', true)
              .eq('category', category)
              .order('published_at', { ascending: false, nullsFirst: false })
              .order('created_at', { ascending: false })
              .limit(30),
            categorySection.limit_count
          )
        })
      )
    : []

  const pinnedNews: LatestNews[] = []
  const normalNews: LatestNews[] = []
  const seenNewsIds = new Set<string>()

  for (const list of newsByCategory) {
    for (const row of list) {
      if (!row.slug) continue
      const key = String(row.id)
      if (seenNewsIds.has(key)) continue
      seenNewsIds.add(key)
      if (isPinnedActive(row, nowTime)) {
        pinnedNews.push(row)
      } else {
        normalNews.push(row)
      }
    }
  }

  return {
    sections,
    jobs: ((jobsData as LatestJob[]) ?? []).filter((row) => isPublicOwnerVisible(row.user)),
    items: ((secondhandData as LatestSecondhand[]) ?? []).filter((row) => isPublicOwnerVisible(row.user)),
    housings: ((housingsData as LatestHousing[]) ?? []).filter((row) => (!row.user ? true : isPublicOwnerVisible(row.user))),
    services: ((servicesData as LatestService[]) ?? []).filter((row) => (!row.user ? true : isPublicOwnerVisible(row.user))),
    news: [...pinnedNews, ...normalNews].slice(0, latestNewsLimit),
  }
}

export default async function LatestPostsSection() {
  const { sections, jobs, items, housings, services, news } = await getLatestPostsData()

  const visibleMainSections = sections
    .filter((section) => section.section_type === 'main' && section.is_visible)
    .sort((a, b) => a.display_order - b.display_order)

  const quickLinks = visibleMainSections
    .map((section) => ({
      label: section.section_name.replace(/^最新/, ''),
      href: MAIN_SECTION_ROUTE[section.section_key] || '#',
    }))
    .filter((item) => item.href !== '#')

  const nowTime = Date.now()

  return (
    <section className="pt-6">
      {/* Section header */}
      <div className="px-4 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-1 h-[18px] bg-blue-500 rounded-full" />
          <h2 className="text-[15px] font-bold text-zinc-800">最新发布</h2>
        </div>

        {/* Quick nav links (not tabs) */}
        <div className="mt-2 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {quickLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="flex-shrink-0 rounded-full bg-zinc-100 px-3 py-1.5 text-[12px] font-semibold text-zinc-700 hover:bg-blue-50 hover:text-blue-700 active:scale-[0.98] transition"
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>

      {visibleMainSections.length === 0 ? <p className="px-4 text-[12px] text-zinc-400 py-2">暂无可展示板块</p> : null}

      {visibleMainSections.map((section) => {
        if (section.section_key === 'latest_jobs') {
          return (
            <div key={section.section_key} className="px-4 mb-5">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[13px] font-semibold text-zinc-500">{section.section_name}</h3>
                <Link href="/jobs" className="flex items-center gap-0.5 text-[12px] text-blue-500 font-medium">
                  更多
                  <ChevronRight size={13} />
                </Link>
              </div>
              {jobs.length === 0 ? (
                <p className="text-[12px] text-zinc-400 py-2">暂无最新信息</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {jobs.map((job) => {
                    const loc = formatJobLocation(job.location)
                    return (
                      <Link
                        key={job.id}
                        href={`/jobs/${job.id}`}
                        className="flex flex-col bg-white rounded-xl px-3 py-2.5 shadow-[0_1px_6px_rgba(0,0,0,0.06)] border border-zinc-100/70 active:scale-[0.98] transition-transform duration-150"
                      >
                        <p className="text-[13px] font-semibold text-zinc-800 line-clamp-2 break-words">{job.title}</p>
                        <div className="mt-1 flex items-center gap-1.5 min-h-4">
                          {isPinnedActive(job, nowTime) ? (
                            <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 border border-amber-100">
                              置顶
                            </span>
                          ) : null}
                          {loc ? (
                            <span className="inline-flex items-center gap-1">
                              <MapPin size={10} className="text-zinc-400 flex-shrink-0" />
                              <span className="text-[11px] text-zinc-400 truncate">{loc}</span>
                            </span>
                          ) : null}
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        }

        if (section.section_key === 'latest_housing') {
          return (
            <div key={section.section_key} className="px-4 mb-5">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[13px] font-semibold text-zinc-500">{section.section_name}</h3>
                <Link href="/housing" className="flex items-center gap-0.5 text-[12px] text-blue-500 font-medium">
                  更多
                  <ChevronRight size={13} />
                </Link>
              </div>
              {housings.length === 0 ? (
                <p className="text-[12px] text-zinc-400 py-2">暂无最新信息</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {housings.map((housing) => (
                    <Link
                      key={housing.id}
                      href={`/housing/${housing.id}`}
                      className="flex flex-col bg-white rounded-xl px-3 py-2.5 shadow-[0_1px_6px_rgba(0,0,0,0.06)] border border-zinc-100/70 active:scale-[0.98] transition-transform duration-150"
                    >
                      <p className="text-[13px] font-semibold text-zinc-800 line-clamp-2 break-words">{housing.title}</p>
                      <div className="mt-1 flex items-center gap-1.5 min-h-4">
                        {isPinnedActive(housing, nowTime) ? (
                          <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 border border-amber-100">
                            置顶
                          </span>
                        ) : null}
                        {housing.location ? (
                          <span className="inline-flex items-center gap-1">
                            <MapPin size={10} className="text-zinc-400 flex-shrink-0" />
                            <span className="text-[11px] text-zinc-400 truncate">{housing.location}</span>
                          </span>
                        ) : null}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )
        }

        if (section.section_key === 'latest_secondhand') {
          return (
            <div key={section.section_key} className="px-4 mb-5">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[13px] font-semibold text-zinc-500">{section.section_name}</h3>
                <Link href="/secondhand" className="flex items-center gap-0.5 text-[12px] text-blue-500 font-medium">
                  更多
                  <ChevronRight size={13} />
                </Link>
              </div>
              {items.length === 0 ? (
                <p className="text-[12px] text-zinc-400 py-2">暂无最新信息</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {items.map((item) => (
                    <Link
                      key={item.id}
                      href={`/secondhand/${item.id}`}
                      className="flex flex-col bg-white rounded-xl px-3 py-2.5 shadow-[0_1px_6px_rgba(0,0,0,0.06)] border border-zinc-100/70 active:scale-[0.98] transition-transform duration-150"
                    >
                      <p className="text-[13px] font-semibold text-zinc-800 line-clamp-2 break-words">{item.title}</p>
                      <div className="mt-1 flex items-center gap-1.5 min-h-4">
                        {isPinnedActive(item, nowTime) ? (
                          <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 border border-amber-100">
                            置顶
                          </span>
                        ) : null}
                        {item.category ? <span className="text-[11px] text-zinc-400 truncate">{item.category}</span> : null}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )
        }

        if (section.section_key === 'latest_services') {
          return (
            <div key={section.section_key} className="px-4 mb-5">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[13px] font-semibold text-zinc-500">{section.section_name}</h3>
                <Link href="/services" className="flex items-center gap-0.5 text-[12px] text-blue-500 font-medium">
                  更多
                  <ChevronRight size={13} />
                </Link>
              </div>
              {services.length === 0 ? (
                <p className="text-[12px] text-zinc-400 py-2">暂无最新信息</p>
              ) : (
                <div className="space-y-2">
                  {services.map((service) => {
                    const thumb = service.images?.[0] ?? null
                    const pinned = isPinnedActive(service, nowTime)
                    return (
                      <Link
                        key={service.id}
                        href={`/services/${service.id}`}
                        className="flex items-center gap-3 bg-white rounded-xl px-3 py-2.5 shadow-[0_1px_6px_rgba(0,0,0,0.06)] border border-zinc-100/70 active:scale-[0.98] transition-transform duration-150"
                      >
                        {/* thumbnail */}
                        <div className="flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden bg-zinc-100 flex items-center justify-center">
                          {thumb ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={thumb} alt={service.title ?? ''} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-2xl select-none" aria-hidden="true">
                              🛠️
                            </span>
                          )}
                        </div>
                        {/* text */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {pinned ? (
                              <span className="inline-flex items-center rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 border border-amber-100 flex-shrink-0">
                                置顶
                              </span>
                            ) : null}
                            <p className="text-[13px] font-semibold text-zinc-800 truncate" title={service.title ?? undefined}>
                              {service.title}
                            </p>
                          </div>
                          {service.category || service.location ? (
                            <p className="text-[11px] text-zinc-400 mt-0.5 truncate">
                              {[service.category, service.location].filter(Boolean).join(' · ')}
                            </p>
                          ) : null}
                          {service.description ? (
                            <p className="text-[11px] text-zinc-400 mt-0.5 line-clamp-2">{service.description}</p>
                          ) : null}
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        }

        if (section.section_key === 'latest_news') {
          return (
            <div key={section.section_key} className="px-4 mb-5">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[13px] font-semibold text-zinc-500">{section.section_name}</h3>
                <Link href="/news" className="flex items-center gap-0.5 text-[12px] text-blue-500 font-medium">
                  更多
                  <ChevronRight size={13} />
                </Link>
              </div>
              {news.length === 0 ? (
                <p className="text-[12px] text-zinc-400 py-2">暂无最新信息</p>
              ) : (
                <div className="space-y-2.5">
                  {news.map((item, idx) => (
                    <Link
                      key={item.id}
                      href={`/news/${item.slug}`}
                      className="flex gap-3 bg-white rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)] border border-zinc-100/70 active:scale-[0.99] transition-transform duration-150"
                    >
                      <div className="flex-shrink-0 w-6 flex flex-col items-center pt-0.5 gap-1.5">
                        <span
                          className={`text-[12px] font-black tabular-nums ${
                            idx === 0
                              ? 'text-rose-500'
                              : idx === 1
                                ? 'text-orange-400'
                                : idx === 2
                                  ? 'text-amber-400'
                                  : 'text-zinc-300'
                          }`}
                        >
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        <div className="w-1 h-1 rounded-full flex-shrink-0 bg-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
                            {item.category}
                          </span>
                          {isPinnedActive(item, nowTime) ? (
                            <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 border border-amber-100">
                              置顶
                            </span>
                          ) : null}
                          <div className="flex items-center gap-0.5 text-zinc-400">
                            <Clock size={10} />
                            <span className="text-[10px]">{formatNewsDate(item.published_at ?? item.created_at)}</span>
                          </div>
                        </div>
                        <p className="text-[13px] font-semibold text-zinc-800 line-clamp-1 leading-snug">{item.title}</p>
                        <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2 leading-relaxed">{getNewsSummary(item)}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )
        }

        return null
      })}
    </section>
  )
}
