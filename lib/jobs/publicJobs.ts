import type { SupabaseClient } from '@supabase/supabase-js'
import { isOwnerPublicVisible } from '@/lib/publicVisibility'
import type { JobPosting } from '@/types'

export async function getPublicJobById(
  supabase: SupabaseClient,
  id: string
): Promise<{ data: JobPosting | null; error: string | null }> {
  const { data, error } = await supabase
    .from('job_postings')
    .select('*, user:users(username, avatar_url, status)')
    .eq('id', id)
    .eq('status', 'published')
    .maybeSingle()

  if (error) return { data: null, error: error.message }
  if (!data || !isOwnerPublicVisible((data as { user?: unknown }).user)) {
    return { data: null, error: null }
  }

  return { data: data as JobPosting, error: null }
}

export async function incrementPublicJobViews(
  supabase: SupabaseClient,
  id: string,
  currentViews: number | null | undefined
) {
  await supabase
    .from('job_postings')
    .update({ views: (currentViews || 0) + 1 })
    .eq('id', id)
    .eq('status', 'published')
}
