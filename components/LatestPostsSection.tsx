import Link from 'next/link'
import { MapPin, ChevronRight, Clock } from 'lucide-react'
import { formatJobLocation } from '@/lib/utils'
import { DEFAULT_HOME_LATEST_SECTIONS, MAIN_SECTION_ROUTE } from '@/lib/homeSections'
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

const HOMEPAGE_GUARD_FILES = ['components/LatestPostsSection.tsx', 'app/page.tsx'] as const
const HOMEPAGE_SUPABASE_PATTERNS = [
  /getPublicSupabaseServerClient/,
  /getServiceSupabaseServerClient/,
  /from\s*\(\s*['"]job_postings['"]\s*\)/,
  /from\s*\(\s*['"]housing_posts['"]\s*\)/,
  /from\s*\(\s*['"]service_posts['"]\s*\)/,
  /from\s*\(\s*['"]secondhand_items['"]\s*\)/,
  /from\s*\(\s*['"]news_posts['"]\s*\)/,
] as const

async function assertHomepageNoSupabaseDependencyInDev() {
  if (process.env.NODE_ENV !== 'development') return

  const [{ readFile }, { join }] = await Promise.all([import('node:fs/promises'), import('node:path')])
  await Promise.all(
    HOMEPAGE_GUARD_FILES.map(async (filePath) => {
      const file = await readFile(join(process.cwd(), filePath), 'utf8')
      const matchedPattern = HOMEPAGE_SUPABASE_PATTERNS.find((pattern) => pattern.test(file))
      if (matchedPattern) {
        throw new Error(
          `[Homepage Cutover Guard] Direct Supabase dependency detected in ${filePath}: "${matchedPattern.toString()}". Homepage must rely only on /api/home-latest-posts.`
        )
      }
    })
  )
}

export default async function LatestPostsSection() {
  await assertHomepageNoSupabaseDependencyInDev()

  let jobs: LatestJob[] = []
  let housing: LatestHousing[] = []
  let services: LatestService[] = []
  let secondhand: LatestSecondhand[] = []
  let news: LatestNews[] = []

  try {
    const res = await fetch(`${SITE_URL}/api/home-latest-posts`, { cache: 'no-store' })
    if (!res.ok) throw new Error('home-latest-posts fetch failed')
    const json = (await res.json()) as {
      jobs?: LatestJob[]
      housing?: LatestHousing[]
      services?: LatestService[]
      secondhand?: LatestSecondhand[]
      news?: LatestNews[]
    }
    jobs = Array.isArray(json.jobs) ? json.jobs : []
    housing = Array.isArray(json.housing) ? json.housing : []
    services = Array.isArray(json.services) ? json.services : []
    secondhand = Array.isArray(json.secondhand) ? json.secondhand : []
    news = Array.isArray(json.news) ? json.news : []
  } catch {
    jobs = []
    housing = []
    services = []
    secondhand = []
    news = []
  }

  const visibleMainSections = DEFAULT_HOME_LATEST_SECTIONS
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
              {housing.length === 0 ? (
                <p className="text-[12px] text-zinc-400 py-2">暂无最新信息</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {housing.map((house) => (
                    <Link
                      key={house.id}
                      href={`/housing/${house.id}`}
                      className="flex flex-col bg-white rounded-xl px-3 py-2.5 shadow-[0_1px_6px_rgba(0,0,0,0.06)] border border-zinc-100/70 active:scale-[0.98] transition-transform duration-150"
                    >
                      <p className="text-[13px] font-semibold text-zinc-800 line-clamp-2 break-words">{house.title}</p>
                      <div className="mt-1 flex items-center gap-1.5 min-h-4">
                        {isPinnedActive(house, nowTime) ? (
                          <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 border border-amber-100">
                            置顶
                          </span>
                        ) : null}
                        {house.location ? (
                          <span className="inline-flex items-center gap-1">
                            <MapPin size={10} className="text-zinc-400 flex-shrink-0" />
                            <span className="text-[11px] text-zinc-400 truncate">{house.location}</span>
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
              {secondhand.length === 0 ? (
                <p className="text-[12px] text-zinc-400 py-2">暂无最新信息</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {secondhand.map((item) => (
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
