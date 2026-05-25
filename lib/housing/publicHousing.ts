import type { SupabaseClient } from '@supabase/supabase-js'
import { isOwnerPublicVisible } from '@/lib/publicVisibility'
import type { HousingPost } from '@/types'

type HousingPublisherRow = {
  username: string | null
  email: string | null
  avatar_url: string | null
  status: 'active' | 'restricted' | 'banned' | null
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
  if (!data) {
    return { data: null, error: null }
  }

  const post = data as HousingPost
  let user: HousingPublisherRow | null = null

  if (post.user_id) {
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('username, email, avatar_url, status')
      .eq('id', post.user_id)
      .maybeSingle()

    if (userError) return { data: null, error: userError.message }
    user = userData as HousingPublisherRow | null
  }

  if (!isOwnerPublicVisible(user)) {
    return { data: null, error: null }
  }

  return {
    data: {
      ...post,
      user: user
        ? {
            username: user.username ?? '',
            email: user.email,
            avatar_url: user.avatar_url ?? undefined,
            status: user.status,
          }
        : undefined,
    },
    error: null,
  }
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
