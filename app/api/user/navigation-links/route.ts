import { NextRequest, NextResponse } from 'next/server'
import { authenticateUserRequest } from '@/lib/request-auth'
import {
  getFriendlySiteName,
  isValidNavigationUrl,
  normalizeNavigationUrl,
} from '@/lib/user-navigation'
import { assertUserCanCreateContent } from '@/lib/accountStatus'

export const dynamic = 'force-dynamic'

type LatestLinkRow = {
  sort_order: number
}

function toTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export async function GET(request: NextRequest) {
  const auth = await authenticateUserRequest(request)
  if ('errorResponse' in auth) return auth.errorResponse

  const { data, error } = await auth.supabase
    .from('user_navigation_links')
    .select('id, title, url, description, open_mode, sort_order, created_at, updated_at')
    .eq('user_id', auth.user.id)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ data: data ?? [] })
}

export async function POST(request: NextRequest) {
  const auth = await authenticateUserRequest(request)
  if ('errorResponse' in auth) return auth.errorResponse

  const permission = await assertUserCanCreateContent(auth.supabase, auth.user.id)
  if (!permission.allowed) {
    return NextResponse.json({ error: permission.message }, { status: 403 })
  }

  const body: unknown = await request.json()
  if (body === null || typeof body !== 'object') {
    return NextResponse.json({ error: '无效请求体' }, { status: 400 })
  }

  const normalizedUrl = normalizeNavigationUrl(toTrimmedString((body as Record<string, unknown>).url))
  if (!normalizedUrl || !isValidNavigationUrl(normalizedUrl)) {
    return NextResponse.json({ error: '请输入正确的网址' }, { status: 400 })
  }

  const normalizedTitleInput = toTrimmedString((body as Record<string, unknown>).title)
  const normalizedTitle = normalizedTitleInput || getFriendlySiteName(normalizedUrl)
  if (!normalizedTitle) {
    return NextResponse.json({ error: '请输入网站名称' }, { status: 400 })
  }

  const { data: latestLinkData } = await auth.supabase
    .from('user_navigation_links')
    .select('sort_order')
    .eq('user_id', auth.user.id)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const latestLink = latestLinkData as LatestLinkRow | null
  const nextSortOrder = (latestLink?.sort_order ?? 0) + 10

  const { data, error } = await auth.supabase
    .from('user_navigation_links')
    .insert({
      user_id: auth.user.id,
      title: normalizedTitle,
      url: normalizedUrl,
      sort_order: nextSortOrder,
      is_active: true,
      open_mode: 'auto',
      description: null,
    })
    .select('id, title, url, description, open_mode, sort_order, created_at, updated_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ data }, { status: 201 })
}
