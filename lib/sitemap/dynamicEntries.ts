import type { MetadataRoute } from 'next'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isPublicUserStatusVisible } from '@/lib/publicVisibility'
import { getSiteUrl } from '@/lib/site'

const DYNAMIC_SITEMAP_LIMIT = 500

type SitemapEntry = MetadataRoute.Sitemap[number]

type OwnerPostRow = {
  id: string | number
  user_id: string | null
  created_at: string | null
  updated_at: string | null
}

type NewsSitemapRow = {
  slug: string | null
  published_at: string | null
  updated_at: string | null
  created_at: string | null
}

type UserStatusRow = {
  id: string
  status: string | null
}

function toLastModified(...values: Array<string | null | undefined>): string {
  return values.find(Boolean) || new Date().toISOString()
}

async function filterPublicOwnerRows<T extends OwnerPostRow>(
  supabase: SupabaseClient,
  rows: T[]
): Promise<T[]> {
  const userIds = Array.from(new Set(rows.map((row) => row.user_id).filter((id): id is string => !!id)))
  if (userIds.length === 0) return []

  const { data, error } = await supabase
    .from('users')
    .select('id, status')
    .in('id', userIds)

  if (error) throw error

  const userStatusMap = new Map<string, string | null>()
  for (const row of (data || []) as UserStatusRow[]) {
    userStatusMap.set(row.id, row.status ?? null)
  }

  return rows.filter((row) => isPublicUserStatusVisible(userStatusMap.get(row.user_id || '')))
}

async function fetchNewsSitemapEntries(supabase: SupabaseClient): Promise<SitemapEntry[]> {
  const { data, error } = await supabase
    .from('news_posts')
    .select('slug, published_at, updated_at, created_at')
    .eq('is_published', true)
    .order('updated_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(DYNAMIC_SITEMAP_LIMIT)

  if (error) throw error

  return ((data || []) as NewsSitemapRow[])
    .filter((row) => !!row.slug)
    .map((row) => ({
      url: getSiteUrl(`/news/${row.slug}`),
      lastModified: toLastModified(row.published_at, row.updated_at, row.created_at),
      changeFrequency: 'weekly',
      priority: 0.7,
    }))
}

async function fetchOwnerPostSitemapEntries(
  supabase: SupabaseClient,
  options: {
    table: string
    pathPrefix: string
    statusFilter: 'published' | 'publishedOrActive'
    requireIsActive?: boolean
  }
): Promise<SitemapEntry[]> {
  let query = supabase
    .from(options.table)
    .select('id, user_id, updated_at, created_at')
    .order('updated_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(DYNAMIC_SITEMAP_LIMIT)

  if (options.statusFilter === 'publishedOrActive') {
    query = query.in('status', ['published', 'active'])
  } else {
    query = query.eq('status', 'published')
  }

  if (options.requireIsActive) {
    query = query.eq('is_active', true)
  }

  const { data, error } = await query
  if (error) throw error

  const publicRows = await filterPublicOwnerRows(supabase, (data || []) as OwnerPostRow[])

  return publicRows.map((row) => ({
    url: getSiteUrl(`/${options.pathPrefix}/${row.id}`),
    lastModified: toLastModified(row.updated_at, row.created_at),
    changeFrequency: 'weekly',
    priority: 0.6,
  }))
}

async function safelyFetchEntries(
  label: string,
  fetchEntries: () => Promise<SitemapEntry[]>
): Promise<SitemapEntry[]> {
  try {
    return await fetchEntries()
  } catch (error) {
    console.error(`Failed to load ${label} sitemap entries`, error instanceof Error ? error.message : error)
    return []
  }
}

export async function fetchDynamicSitemapEntries(supabase: SupabaseClient): Promise<SitemapEntry[]> {
  const [news, services, jobs, housing, secondhand] = await Promise.all([
    safelyFetchEntries('news', () => fetchNewsSitemapEntries(supabase)),
    safelyFetchEntries('services', () =>
      fetchOwnerPostSitemapEntries(supabase, {
        table: 'service_posts',
        pathPrefix: 'services',
        statusFilter: 'publishedOrActive',
        requireIsActive: true,
      })
    ),
    safelyFetchEntries('jobs', () =>
      fetchOwnerPostSitemapEntries(supabase, {
        table: 'job_postings',
        pathPrefix: 'jobs',
        statusFilter: 'published',
      })
    ),
    safelyFetchEntries('housing', () =>
      fetchOwnerPostSitemapEntries(supabase, {
        table: 'housing_posts',
        pathPrefix: 'housing',
        statusFilter: 'publishedOrActive',
      })
    ),
    safelyFetchEntries('secondhand', () =>
      fetchOwnerPostSitemapEntries(supabase, {
        table: 'secondhand_items',
        pathPrefix: 'secondhand',
        statusFilter: 'published',
      })
    ),
  ])

  return [...news, ...services, ...jobs, ...housing, ...secondhand]
}

export { DYNAMIC_SITEMAP_LIMIT }
