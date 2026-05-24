import type { HomeLatestSupabaseClient } from './client'
import { isPublicUserStatusVisible } from '@/lib/publicVisibility'

export async function getUserStatusMap(
  supabase: HomeLatestSupabaseClient,
  userIds: string[]
): Promise<Map<string, string | null>> {
  const map = new Map<string, string | null>()
  if (userIds.length === 0) return map

  const { data } = await supabase.from('users').select('id, status').in('id', userIds)
  for (const user of (data || []) as { id: string; status: string | null }[]) {
    map.set(user.id, user.status ?? null)
  }

  return map
}

export function isUserVisible(userStatusMap: Map<string, string | null>, userId: string): boolean {
  const status = userStatusMap.get(userId)
  return isPublicUserStatusVisible(status)
}
