import type { SupabaseClient } from '@supabase/supabase-js'
import { isOwnerPublicVisible } from '@/lib/publicVisibility'
import type { HousingPost } from '@/types'

export async function getPublicHousingById(
  supabase: SupabaseClient,
  id: string
): Promise<{ data: HousingPost | null; error: string | null }> {
  const { data, error } = await supabase
    .from('housing_posts')
    .select('*, user:users(username, avatar_url, status)')
    .eq('id', id)
    .in('status', ['published', 'active'])
    .maybeSingle()

  if (error) return { data: null, error: error.message }
  if (!data || !isOwnerPublicVisible((data as { user?: unknown }).user)) {
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
