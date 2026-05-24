import type { HomeLatestSection } from '@/lib/homeSections'
import type { HomeLatestSupabaseClient } from './client'
import { getLatestHousing, type LatestHousing } from './getLatestHousing'
import { getLatestJobs, type LatestJob } from './getLatestJobs'
import { getLatestNews, type LatestNews } from './getLatestNews'
import { getLatestSecondhand, type LatestSecondhand } from './getLatestSecondhand'
import { getLatestServices } from './getLatestServices'
import {
  getHomeLatestSections,
  getMainSectionLimit,
  getSectionMap,
  isSectionVisible,
} from './sections'

export type HomeLatestPayload = {
  sections: HomeLatestSection[]
  jobs: LatestJob[]
  housing: LatestHousing[]
  services: unknown[]
  secondhand: LatestSecondhand[]
  news: LatestNews[]
}

export async function getHomeLatestPayload(
  supabase: HomeLatestSupabaseClient
): Promise<HomeLatestPayload> {
  const sections = await getHomeLatestSections(supabase)
  const sectionMap = getSectionMap(sections)
  const nowIso = new Date().toISOString()
  const nowTime = Date.now()

  const jobs = isSectionVisible(sectionMap, 'latest_jobs')
    ? await getLatestJobs(supabase, getMainSectionLimit(sectionMap, 'latest_jobs', 6), nowIso)
    : []

  const housing = isSectionVisible(sectionMap, 'latest_housing')
    ? await getLatestHousing(supabase, getMainSectionLimit(sectionMap, 'latest_housing', 6), nowTime)
    : []

  const services = isSectionVisible(sectionMap, 'latest_services')
    ? await getLatestServices(supabase, getMainSectionLimit(sectionMap, 'latest_services', 6))
    : []

  const secondhand = isSectionVisible(sectionMap, 'latest_secondhand')
    ? await getLatestSecondhand(supabase, getMainSectionLimit(sectionMap, 'latest_secondhand', 6), nowIso)
    : []

  const news = isSectionVisible(sectionMap, 'latest_news')
    ? await getLatestNews(supabase, sections, getMainSectionLimit(sectionMap, 'latest_news', 15), nowIso, nowTime)
    : []

  return {
    sections,
    jobs,
    housing,
    services,
    secondhand,
    news,
  }
}
