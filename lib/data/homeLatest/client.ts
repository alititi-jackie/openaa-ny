import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export type HomeLatestSupabaseClient = SupabaseClient

export function getHomeLatestServiceClient(): HomeLatestSupabaseClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return null
  }

  return createClient(supabaseUrl, serviceRoleKey)
}
