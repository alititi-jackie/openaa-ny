import { listPublicServices } from '@/lib/services/publicServices'
import type { HomeLatestSupabaseClient } from './client'

export async function getLatestServices(
  supabase: HomeLatestSupabaseClient,
  limit: number
): Promise<unknown[]> {
  const { data } = await listPublicServices(supabase, {})
  return data.slice(0, limit)
}
