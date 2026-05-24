import type { HomeLatestSupabaseClient } from './client'
import { isPinnedActive, toSortableTime } from './pinned'
import { getUserStatusMap, isUserVisible } from './visibility'

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

export type LatestHousing = Omit<HousingRow, 'user_id'>

export async function getLatestHousing(
  supabase: HomeLatestSupabaseClient,
  limit: number,
  nowTime: number
): Promise<LatestHousing[]> {
  const { data } = await supabase
    .from('housing_posts')
    .select(
      'id, user_id, type, title, description, price, location, room_type, images, status, views, created_at, updated_at, is_pinned, pinned_until, pinned_order'
    )
    .in('status', ['published', 'active'])
    .order('created_at', { ascending: false })
    .limit(limit * 5 + 10)

  const rows = (data || []) as HousingRow[]
  const userIds = Array.from(new Set(rows.map((row) => row.user_id).filter(Boolean)))
  const userStatusMap = await getUserStatusMap(supabase, userIds)
  const visible = rows.filter((row) => isUserVisible(userStatusMap, row.user_id))

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

  return visible.slice(0, limit).map(({ user_id, ...rest }) => {
    void user_id
    return rest
  })
}
