import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { listPublicServices } from '@/lib/services/publicServices'
import {
  DEFAULT_HOME_LATEST_SECTIONS,
  NEWS_CATEGORY_BY_SECTION_KEY,
  type HomeLatestSection,
} from '@/lib/homeSections'

export const dynamic = 'force-dynamic'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function toSortableTime(value: string | null | undefined): number {
  if (!value) return 0
  const time = new Date(value).getTime()
  return Number.isNaN(time) ? 0 : time
}

function isPinnedActive(
  item: { is_pinned?: boolean | null; pinned_until?: string | null },
  nowTime: number
): boolean {
  if (!item.is_pinned) return false
  if (!item.pinned_until) return true
  return toSortableTime(item.pinned_until) > nowTime
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

async function fetchSections(
  supabase: ReturnType<typeof getServiceClient>
): Promise<HomeLatestSection[]> {
  const { data, error } = await supabase
    .from('home_latest_sections')
    .select('section_key, section_name, section_type, parent_key, is_visible, display_order, limit_count')
    .order('display_order', { ascending: true })
    .order('section_key', { ascending: true })

  if (error) {
    console.error('Failed to load homepage latest sections:', error)
    return DEFAULT_HOME_LATEST_SECTIONS
  }

  const sections = asValidSections(data)
  return sections.length > 0 ? sections : DEFAULT_HOME_LATEST_SECTIONS
}

const INVISIBLE_USER_STATUSES = new Set(['banned', 'restricted', 'hidden', 'deleted'])

async function getUserStatusMap(
  supabase: ReturnType<typeof getServiceClient>,
  userIds: string[]
): Promise<Map<string, string | null>> {
  const map = new Map<string, string | null>()
  if (userIds.length === 0) return map
  const { data } = await supabase.from('users').select('id, status').in('id', userIds)
  for (const u of (data || []) as { id: string; status: string | null }[]) {
    map.set(u.id, u.status ?? null)
  }
  return map
}

function isUserVisible(userStatusMap: Map<string, string | null>, userId: string): boolean {
  const status = userStatusMap.get(userId)
  if (status === undefined || status === null) return true
  return !INVISIBLE_USER_STATUSES.has(status.toLowerCase())
}

async function fetchPinnedFirst<T extends { id: string | number }>(
  pinnedQuery: PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  normalQuery: PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  limit: number
): Promise<T[]> {
  const [pinnedRes, normalRes] = await Promise.all([pinnedQuery, normalQuery])
  if (pinnedRes.error && normalRes.error) return []

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

// ---- Row types ----

type JobRow = {
  id: string | number
  user_id: string
  title: string | null
  location: string | null
  created_at: string | null
  is_pinned: boolean | null
  pinned_until: string | null
}

type HousingRow = {
  id: number
  user_id: string
  type: string | null
  title: string | null
  description: string | null
  price: number | null
  location: string | null
  room_type: string | null
  images: unknown
  status: string | null
  views: number | null
  created_at: string | null
  updated_at: string | null
  is_pinned: boolean | null
  pinned_until: string | null
  pinned_order: number | null
}

type SecondhandRow = {
  id: string | number
  user_id: string
  title: string | null
  category: string | null
  created_at: string | null
  is_pinned: boolean | null
  pinned_until: string | null
}

type NewsRow = {
  id: string
  slug: string | null
  title: string
  category: string
  summary: string | null
  content: string
  created_at: string
  published_at: string | null
  is_pinned: boolean | null
  pinned_until: string | null
}

export async function GET() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Supabase service role missing' }, { status: 500 })
  }

  const supabase = getServiceClient()
  const sections = await fetchSections(supabase)
  const sectionMap = new Map(sections.map((s) => [s.section_key, s]))
  const nowIso = new Date().toISOString()
  const nowTime = Date.now()

  const mainLimit = (key: string, fallback: number) => {
    const value = sectionMap.get(key)?.limit_count
    return typeof value === 'number' && value > 0 ? Math.min(30, value) : fallback
  }

  // ---- Jobs ----
  const jobsVisible = sectionMap.get('latest_jobs')?.is_visible === true
  const jobsLimit = mainLimit('latest_jobs', 6)
  type JobOut = Omit<JobRow, 'user_id'>
  let jobs: JobOut[] = []

  if (jobsVisible) {
    const rawJobs = await fetchPinnedFirst<JobRow>(
      supabase
        .from('job_postings')
        .select('id, user_id, title, location, created_at, is_pinned, pinned_until')
        .eq('status', 'published')
        .eq('is_pinned', true)
        .or(`pinned_until.is.null,pinned_until.gt.${nowIso}`)
        .order('pinned_order', { ascending: true })
        .order('created_at', { ascending: false })
        .limit(30),
      supabase
        .from('job_postings')
        .select('id, user_id, title, location, created_at, is_pinned, pinned_until')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(30),
      jobsLimit
    )

    const userIds = Array.from(new Set(rawJobs.map((j) => j.user_id).filter(Boolean)))
    const userStatusMap = await getUserStatusMap(supabase, userIds)

    jobs = rawJobs
      .filter((j) => isUserVisible(userStatusMap, j.user_id))
      .slice(0, jobsLimit)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .map(({ user_id, ...rest }) => rest)
  }

  // ---- Housing ----
  // Reuses /api/housing logic: service-role, pinned-first sort, user status filtering
  const housingVisible = sectionMap.get('latest_housing')?.is_visible === true
  const housingLimit = mainLimit('latest_housing', 6)
  type HousingOut = Omit<HousingRow, 'user_id'>
  let housing: HousingOut[] = []

  if (housingVisible) {
    const { data: housingData } = await supabase
      .from('housing_posts')
      .select(
        'id, user_id, type, title, description, price, location, room_type, images, status, views, created_at, updated_at, is_pinned, pinned_until, pinned_order'
      )
      .in('status', ['published', 'active'])
      .order('created_at', { ascending: false })
      .limit(housingLimit * 5 + 10) // Buffer: fetch more rows to account for user-status filtering

    const housingRows = (housingData || []) as HousingRow[]
    const userIds = Array.from(new Set(housingRows.map((r) => r.user_id).filter(Boolean)))
    const userStatusMap = await getUserStatusMap(supabase, userIds)

    const visible = housingRows.filter((row) => isUserVisible(userStatusMap, row.user_id))

    visible.sort((a, b) => {
      const aPinned = isPinnedActive(a, nowTime)
      const bPinned = isPinnedActive(b, nowTime)
      if (aPinned !== bPinned) return aPinned ? -1 : 1
      if (aPinned && bPinned) {
        const diff = (a.pinned_order ?? 0) - (b.pinned_order ?? 0)
        if (diff !== 0) return diff
      }
      return toSortableTime(b.created_at) - toSortableTime(a.created_at)
    })

    housing = visible
      .slice(0, housingLimit)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .map(({ user_id, ...rest }) => rest)
  }

  // ---- Services ----
  // Reuses listPublicServices (service-role, pinned-first, user status filtering)
  const servicesVisible = sectionMap.get('latest_services')?.is_visible === true
  const servicesLimit = mainLimit('latest_services', 6)
  let services: unknown[] = []

  if (servicesVisible) {
    const { data: servicesData } = await listPublicServices(supabase, {})
    services = servicesData.slice(0, servicesLimit)
  }

  // ---- Secondhand ----
  const secondhandVisible = sectionMap.get('latest_secondhand')?.is_visible === true
  const secondhandLimit = mainLimit('latest_secondhand', 6)
  type SecondhandOut = Omit<SecondhandRow, 'user_id'>
  let secondhand: SecondhandOut[] = []

  if (secondhandVisible) {
    const rawSecondhand = await fetchPinnedFirst<SecondhandRow>(
      supabase
        .from('secondhand_items')
        .select('id, user_id, title, category, created_at, is_pinned, pinned_until')
        .eq('status', 'published')
        .eq('is_pinned', true)
        .or(`pinned_until.is.null,pinned_until.gt.${nowIso}`)
        .order('pinned_order', { ascending: true })
        .order('created_at', { ascending: false })
        .limit(30),
      supabase
        .from('secondhand_items')
        .select('id, user_id, title, category, created_at, is_pinned, pinned_until')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(30),
      secondhandLimit
    )

    const userIds = Array.from(new Set(rawSecondhand.map((s) => s.user_id).filter(Boolean)))
    const userStatusMap = await getUserStatusMap(supabase, userIds)

    secondhand = rawSecondhand
      .filter((s) => isUserVisible(userStatusMap, s.user_id))
      .slice(0, secondhandLimit)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .map(({ user_id, ...rest }) => rest)
  }

  // ---- News ----
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

  const newsByCategory: NewsRow[][] = latestNewsVisible
    ? await Promise.all(
        newsCategorySections.map(async (categorySection) => {
          const category = NEWS_CATEGORY_BY_SECTION_KEY[categorySection.section_key]
          if (!category) return [] as NewsRow[]

          return fetchPinnedFirst<NewsRow>(
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

  const pinnedNews: NewsRow[] = []
  const normalNews: NewsRow[] = []
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

  const news = [...pinnedNews, ...normalNews].slice(0, latestNewsLimit)

  const response = NextResponse.json({
    sections,
    jobs,
    housing,
    services,
    secondhand,
    news,
  })
  response.headers.set('Cache-Control', 'no-store')
  return response
}
