import { MetadataRoute } from 'next'
import { fetchDynamicSitemapEntries } from '@/lib/sitemap/dynamicEntries'
import { getServiceSupabaseServerClient } from '@/lib/serverSupabase'
import { getSiteUrl } from '@/lib/site'

type SitemapEntry = MetadataRoute.Sitemap[number]

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date().toISOString()

  // Only include public, indexable pages.
  // Do NOT include admin/auth/profile, API routes, publish/edit flows, or "my" pages.
  const staticEntries: SitemapEntry[] = [
    {
      url: getSiteUrl('/'),
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: getSiteUrl('/jobs'),
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: getSiteUrl('/housing'),
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: getSiteUrl('/secondhand'),
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: getSiteUrl('/services'),
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: getSiteUrl('/news'),
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: getSiteUrl('/navigation'),
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.64,
    },
    {
      url: getSiteUrl('/dmv'),
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.64,
    },
    {
      url: getSiteUrl('/dmv/ny/practice'),
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.64,
    },
    {
      url: getSiteUrl('/dmv/ny/questions'),
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.64,
    },
    {
      url: getSiteUrl('/dmv/ny/mock-test'),
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.64,
    },
    {
      url: getSiteUrl('/dmv/ny/sign-test'),
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.64,
    },
    {
      url: getSiteUrl('/dmv/tickets'),
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.64,
    },
  ]

  const supabase = getServiceSupabaseServerClient()
  if (!supabase) {
    console.error('Failed to load dynamic sitemap entries: Supabase server client is not configured')
    return staticEntries
  }

  const dynamicEntries = await fetchDynamicSitemapEntries(supabase)
  return [...staticEntries, ...dynamicEntries]
}
