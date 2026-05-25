import type { SupabaseClient } from '@supabase/supabase-js'
import { isPublicUserStatusVisible } from '@/lib/publicVisibility'
import type { HousingPost } from '@/types'

type UserStatusRow = {
  status: string | null
}

async function isHousingOwnerVisible(supabase: SupabaseClient, userId: unknown): Promise<boolean> {
  if (typeof userId !== 'string' || !userId) {
    return isPublicUserStatusVisible(undefined)
  }

  const { data, error } = await supabase
    .from('users')
    .select('status')
    .eq('id', userId)
    .maybeSingle()

  if (error) return false
  return isPublicUserStatusVisible((data as UserStatusRow | null)?.status)
}

export async function getPublicHousingById(
  supabase: SupabaseClient,
  id: string
): Promise<{ data: HousingPost | null; error: string | null }> {
  const { data, error } = await supabase
    .from('housing_posts')
    .select('*')
    .eq('id', id)
    .in('status', ['published', 'active'])
    .maybeSingle()

  if (error) return { data: null, error: error.message }
  if (!data || !(await isHousingOwnerVisible(supabase, (data as { user_id?: unknown }).user_id))) {
    return { data: null, error: null }
  }

  return { data: data as HousingPost, error: null }
}

export async function incrementPublicHousingViews(
  supabase: SupabaseClient,
  id: string,
  currentViews: number | null | undefined
) {
  await supabase
    .from('housing_posts')
    .update({ views: (currentViews || 0) + 1 })
    .eq('id', id)
    .in('status', ['published', 'active'])
}
