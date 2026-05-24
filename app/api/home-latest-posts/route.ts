import { NextResponse } from 'next/server'
import { getHomeLatestPayload } from '@/lib/data/homeLatest/getHomeLatestPayload'
import { getHomeLatestServiceClient } from '@/lib/data/homeLatest/client'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = getHomeLatestServiceClient()

  if (!supabase) {
    return NextResponse.json({ error: 'Supabase service role missing' }, { status: 500 })
  }

  const payload = await getHomeLatestPayload(supabase)
  const response = NextResponse.json(payload)
  response.headers.set('Cache-Control', 'no-store')
  return response
}
