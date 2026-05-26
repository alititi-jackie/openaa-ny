import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  isNotificationType,
  isPlainMetadata,
  NOTIFICATIONS_SELECT,
  type NotificationType,
  toNullableTrimmedString,
  toOptionalIsoDate,
  toTrimmedString,
  validateNotificationText,
} from '@/lib/notifications'

export const dynamic = 'force-dynamic'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function checkAdminToken(request: NextRequest): boolean {
  const token = request.headers.get('x-admin-token')
  return token === process.env.ADMIN_TOKEN && !!process.env.ADMIN_TOKEN
}

function parsePositiveInt(value: string | null, fallback: number, max?: number) {
  if (!value) return fallback
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 1) return fallback
  return typeof max === 'number' ? Math.min(parsed, max) : parsed
}

function sanitizeSearch(value: string | null) {
  return value?.trim().replace(/[%,()]/g, ' ').replace(/\s+/g, ' ').slice(0, 120) ?? ''
}

export async function GET(request: NextRequest) {
  if (!checkAdminToken(request)) {
    return NextResponse.json({ error: '无权限访问' }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const page = parsePositiveInt(searchParams.get('page'), 1)
  const limit = parsePositiveInt(searchParams.get('limit'), 20, 50)
  const offset = (page - 1) * limit
  const search = sanitizeSearch(searchParams.get('search'))
  const typeParam = searchParams.get('type')?.trim()
  const readStatus = searchParams.get('read_status')?.trim() || 'all'

  if (typeParam && !isNotificationType(typeParam)) {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  }
  if (!['all', 'unread', 'read'].includes(readStatus)) {
    return NextResponse.json({ error: 'Invalid read_status' }, { status: 400 })
  }

  const supabase = getServiceClient()
  let userIdsForSearch: string[] = []

  if (search) {
    const { data: matchedUsers, error: userSearchError } = await supabase
      .from('users')
      .select('id')
      .or(`email.ilike.%${search}%,username.ilike.%${search}%`)
      .limit(100)

    if (userSearchError) {
      return NextResponse.json({ error: 'Failed to search users' }, { status: 400 })
    }
    userIdsForSearch = (matchedUsers ?? []).map((user) => String(user.id)).filter(Boolean)
  }

  let query = supabase
    .from('notifications')
    .select(NOTIFICATIONS_SELECT, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (typeParam) {
    query = query.eq('type', typeParam as NotificationType)
  }
  if (readStatus === 'unread') {
    query = query.is('read_at', null)
  } else if (readStatus === 'read') {
    query = query.not('read_at', 'is', null)
  }
  if (search) {
    const searchClauses = [`title.ilike.%${search}%`, `body.ilike.%${search}%`]
    if (userIdsForSearch.length > 0) {
      searchClauses.push(`user_id.in.(${userIdsForSearch.join(',')})`)
    }
    query = query.or(searchClauses.join(','))
  }

  const { data, error, count } = await query
  if (error) {
    return NextResponse.json({ error: 'Failed to load notifications' }, { status: 400 })
  }

  const userIds = Array.from(new Set((data ?? []).map((item) => String(item.user_id)).filter(Boolean)))
  const userMap = new Map<string, { id: string; email: string | null; username: string | null }>()

  if (userIds.length > 0) {
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, username')
      .in('id', userIds)

    if (usersError) {
      return NextResponse.json({ error: 'Failed to load notification users' }, { status: 400 })
    }
    for (const user of users ?? []) {
      userMap.set(String(user.id), {
        id: String(user.id),
        email: typeof user.email === 'string' ? user.email : null,
        username: typeof user.username === 'string' ? user.username : null,
      })
    }
  }

  const total = count ?? 0
  const totalPages = Math.max(1, Math.ceil(total / limit))
  return NextResponse.json({
    data: (data ?? []).map((item) => ({
      ...item,
      user: userMap.get(String(item.user_id)) ?? {
        id: String(item.user_id),
        email: null,
        username: null,
      },
    })),
    total,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasPrev: page > 1,
      hasNext: page < totalPages,
    },
  })
}

export async function POST(request: NextRequest) {
  if (!checkAdminToken(request)) {
    return NextResponse.json({ error: '无权限访问' }, { status: 401 })
  }

  const body: unknown = await request.json()
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const payload = body as Record<string, unknown>
  if (payload.audience !== undefined && payload.audience !== 'user') {
    return NextResponse.json({ error: 'Only user audience is supported' }, { status: 400 })
  }

  const userId = toTrimmedString(payload.user_id)
  const type = payload.type
  const title = toTrimmedString(payload.title)
  const notificationBody = toTrimmedString(payload.body)
  const linkUrl = toNullableTrimmedString(payload.link_url)
  const expiresAt = toOptionalIsoDate(payload.expires_at)
  const metadata = payload.metadata === undefined ? {} : payload.metadata

  if (!userId) return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
  if (!isNotificationType(type)) return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  if (expiresAt === undefined) return NextResponse.json({ error: 'Invalid expires_at' }, { status: 400 })
  if (!isPlainMetadata(metadata)) {
    return NextResponse.json({ error: 'metadata must be an object' }, { status: 400 })
  }

  const textError = validateNotificationText(title, notificationBody, linkUrl)
  if (textError) return textError

  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      audience: 'user',
      type,
      title,
      body: notificationBody,
      link_url: linkUrl,
      metadata,
      expires_at: expiresAt,
    })
    .select(NOTIFICATIONS_SELECT)
    .single()

  if (error) {
    console.error('[admin notifications] create failed', error)
    return NextResponse.json({ error: 'Failed to create notification' }, { status: 400 })
  }
  return NextResponse.json({ data }, { status: 201 })
}
