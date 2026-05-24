import { NextRequest, NextResponse } from 'next/server'
import { authenticateUserRequest } from '@/lib/request-auth'
import {
  getFriendlySiteName,
  isValidNavigationUrl,
  normalizeNavigationUrl,
} from '@/lib/user-navigation'
import { assertUserCanDeleteOwnContent, assertUserCanEditOwnContent } from '@/lib/accountStatus'

export const dynamic = 'force-dynamic'

type ExistingLinkRow = {
  id: string
  title: string
  url: string
}

function toOptionalString(value: unknown): string | undefined {
  if (value === undefined) return undefined
  return typeof value === 'string' ? value.trim() : undefined
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateUserRequest(request)
  if ('errorResponse' in auth) return auth.errorResponse

  const permission = await assertUserCanEditOwnContent(auth.supabase, auth.user.id)
  if (!permission.allowed) {
    return NextResponse.json({ error: permission.message }, { status: 403 })
  }

  const body: unknown = await request.json()
  if (body === null || typeof body !== 'object') {
    return NextResponse.json({ error: '无效请求体' }, { status: 400 })
  }

  const { id } = await params

  const { data: existingLinkData, error: existingError } = await auth.supabase
    .from('user_navigation_links')
    .select('id, title, url')
    .eq('id', id)
    .eq('user_id', auth.user.id)
    .single()

  const existingLink = existingLinkData as ExistingLinkRow | null

  if (existingError || !existingLink) {
    return NextResponse.json({ error: '网址不存在' }, { status: 404 })
  }

  const titleInput = toOptionalString((body as Record<string, unknown>).title)
  const urlInput = toOptionalString((body as Record<string, unknown>).url)

  if (titleInput === undefined && urlInput === undefined) {
    return NextResponse.json({ error: '至少需要提供一个可更新字段' }, { status: 400 })
  }

  const normalizedUrl = urlInput === undefined ? existingLink.url : normalizeNavigationUrl(urlInput)
  if (!normalizedUrl || !isValidNavigationUrl(normalizedUrl)) {
    return NextResponse.json({ error: '请输入正确的网址' }, { status: 400 })
  }

  const normalizedTitle =
    titleInput === undefined ? existingLink.title : titleInput || getFriendlySiteName(normalizedUrl)

  if (!normalizedTitle) {
    return NextResponse.json({ error: '请输入网站名称' }, { status: 400 })
  }

  const { data, error } = await auth.supabase
    .from('user_navigation_links')
    .update({
      title: normalizedTitle,
      url: normalizedUrl,
    })
    .eq('id', id)
    .eq('user_id', auth.user.id)
    .select('id, title, url, description, open_mode, sort_order, created_at, updated_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ data })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateUserRequest(request)
  if ('errorResponse' in auth) return auth.errorResponse

  const permission = await assertUserCanDeleteOwnContent(auth.supabase, auth.user.id)
  if (!permission.allowed) {
    return NextResponse.json({ error: permission.message }, { status: 403 })
  }

  const { id } = await params
  const { error } = await auth.supabase
    .from('user_navigation_links')
    .update({ is_active: false })
    .eq('id', id)
    .eq('user_id', auth.user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
