import { NEWS_CATEGORY_BY_SECTION_KEY, type HomeLatestSection } from '@/lib/homeSections'
import type { HomeLatestSupabaseClient } from './client'
import { fetchPinnedFirst, isPinnedActive } from './pinned'

export type LatestNews = {
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

export async function getLatestNews(
  supabase: HomeLatestSupabaseClient,
  sections: HomeLatestSection[],
  limit: number,
  nowIso: string,
  nowTime: number
): Promise<LatestNews[]> {
  const newsCategorySections = sections
    .filter(
      (section) =>
        section.section_type === 'news_category' &&
        section.parent_key === 'latest_news' &&
        section.is_visible
    )
    .sort((a, b) => a.display_order - b.display_order)

  const newsByCategory = await Promise.all(
    newsCategorySections.map(async (categorySection) => {
      const category = NEWS_CATEGORY_BY_SECTION_KEY[categorySection.section_key]
      if (!category) return [] as LatestNews[]

      return fetchPinnedFirst<LatestNews>(
        supabase
          .from('news_posts')
          .select('id, slug, title, category, summary, content, created_at, published_at, is_pinned, pinned_until')
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
          .select('id, slug, title, category, summary, content, created_at, published_at, is_pinned, pinned_until')
          .eq('is_published', true)
          .eq('category', category)
          .order('published_at', { ascending: false, nullsFirst: false })
          .order('created_at', { ascending: false })
          .limit(30),
        categorySection.limit_count
      )
    })
  )

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

  return [...pinnedNews, ...normalNews].slice(0, limit)
}
