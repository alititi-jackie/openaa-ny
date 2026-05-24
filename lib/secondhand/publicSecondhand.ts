import type { SupabaseClient } from '@supabase/supabase-js'
import { isOwnerPublicVisible } from '@/lib/publicVisibility'
import type { SecondhandItem } from '@/types'

export async function getPublicSecondhandById(
  supabase: SupabaseClient,
  id: string
): Promise<{ data: SecondhandItem | null; error: string | null }> {
  const { data, error } = await supabase
    .from('secondhand_items')
    .select('*, user:users(username, avatar_url, status)')
    .eq('id', id)
    .eq('status', 'published')
    .maybeSingle()

  if (error) return { data: null, error: error.message }
  if (!data || !isOwnerPublicVisible((data as { user?: unknown }).user)) {
    return { data: null, error: null }
  }

  return { data: data as SecondhandItem, error: null }
}

export async function incrementPublicSecondhandViews(
  supabase: SupabaseClient,
  id: string,
  currentViews: number | null | undefined
) {
  await supabase
    .from('secondhand_items')
    .update({ views: (currentViews || 0) + 1 })
    .eq('id', id)
    .eq('status', 'published')
}
