import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { clampPageSize, normalizeSearchParam, parsePageParam } from '@/lib/api/params'
import { listPublicServices } from '@/lib/services/publicServices'

export const dynamic = 'force-dynamic'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function normalizeFilter(value: string | null): string {
  return (value || '').trim()
}

export async function GET(request: NextRequest) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Supabase service role missing' }, { status: 500 })
  }

  const { searchParams } = new URL(request.url)
  const location = normalizeFilter(searchParams.get('location'))
  const category = normalizeFilter(searchParams.get('category'))
  const search = normalizeSearchParam(searchParams.get('search'))
  const page = parsePageParam(searchParams.get('page'))
  const rawLimit = searchParams.get('pageSize') ?? searchParams.get('limit')
  const limit = rawLimit === null ? undefined : clampPageSize(rawLimit, 50, 50)

  const supabase = getServiceClient()
  const { data, error } = await listPublicServices(supabase, { location, category, search, page, limit })
  if (error) {
    return NextResponse.json({ error }, { status: 400 })
  }

  return NextResponse.json({ data })
}
