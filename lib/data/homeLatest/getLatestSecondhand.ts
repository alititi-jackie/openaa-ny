import type { HomeLatestSupabaseClient } from './client'
import { fetchPinnedFirst } from './pinned'
import { getUserStatusMap, isUserVisible } from './visibility'

type SecondhandRow = {
  id: string | number
  user_id: string
  title: string | null
  category: string | null
  created_at: string | null
  is_pinned: boolean | null
  pinned_until: string | null
}

export type LatestSecondhand = Omit<SecondhandRow, 'user_id'>

export async function getLatestSecondhand(
  supabase: HomeLatestSupabaseClient,
  limit: number,
  nowIso: string
): Promise<LatestSecondhand[]> {
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
    limit
  )

  const userIds = Array.from(new Set(rawSecondhand.map((item) => item.user_id).filter(Boolean)))
  const userStatusMap = await getUserStatusMap(supabase, userIds)

  return rawSecondhand
    .filter((item) => isUserVisible(userStatusMap, item.user_id))
    .slice(0, limit)
    .map(({ user_id, ...rest }) => {
      void user_id
      return rest
    })
}
