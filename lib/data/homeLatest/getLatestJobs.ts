import type { HomeLatestSupabaseClient } from './client'
import { fetchPinnedFirst } from './pinned'
import { getUserStatusMap, isUserVisible } from './visibility'

type JobRow = {
  id: string | number
  user_id: string
  title: string | null
  location: string | null
  created_at: string | null
  is_pinned: boolean | null
  pinned_until: string | null
}

export type LatestJob = Omit<JobRow, 'user_id'>

export async function getLatestJobs(
  supabase: HomeLatestSupabaseClient,
  limit: number,
  nowIso: string
): Promise<LatestJob[]> {
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
    limit
  )

  const userIds = Array.from(new Set(rawJobs.map((job) => job.user_id).filter(Boolean)))
  const userStatusMap = await getUserStatusMap(supabase, userIds)

  return rawJobs
    .filter((job) => isUserVisible(userStatusMap, job.user_id))
    .slice(0, limit)
    .map(({ user_id, ...rest }) => {
      void user_id
      return rest
    })
}
