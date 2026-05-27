import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createNotificationForUser } from '@/lib/notifications'

export const dynamic = 'force-dynamic'

const VALID_STATUSES = ['active', 'restricted', 'banned'] as const
type UserStatus = typeof VALID_STATUSES[number]

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

function normalizeOptionalText(value: unknown): string | null | undefined {
  if (value === undefined) return undefined
  if (value === null) return null
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function isUserStatus(value: unknown): value is UserStatus {
  return VALID_STATUSES.includes(value as UserStatus)
}

function getStatusNotification(status: UserStatus) {
  if (status === 'banned') {
    return {
      title: '账号已被限制',
      body: '你的账号已被管理员限制，部分发布或互动功能可能暂时不可用。如有疑问，请通过“我的”页面中的“反馈与举报”联系 OpenAA 管理员。',
    }
  }

  if (status === 'restricted') {
    return {
      title: '账号功能受限',
      body: '你的账号当前处于受限状态，部分发布或管理功能可能暂时不可用。如有疑问，请通过“我的”页面中的“反馈与举报”联系 OpenAA 管理员。',
    }
  }

  return {
    title: '账号已恢复',
    body: '你的账号状态已恢复正常，可以继续使用 OpenAA 的相关功能。',
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!checkAdminToken(request)) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  const { id } = await params
  const body: unknown = await request.json()

  if (body === null || typeof body !== 'object') {
    return NextResponse.json({ error: '无效请求体' }, { status: 400 })
  }

  const payload = body as Record<string, unknown>
  const updates: Record<string, unknown> = {}
  const now = new Date().toISOString()
  let requestedStatus: UserStatus | null = null

  if ('status' in payload) {
    if (!VALID_STATUSES.includes(payload.status as UserStatus)) {
      return NextResponse.json({ error: '无效的用户状态' }, { status: 400 })
    }

    const status = payload.status as UserStatus
    requestedStatus = status
    updates.status = status
    updates.last_admin_action_at = now

    if (status === 'banned') {
      updates.banned_at = now
      updates.banned_by = 'admin'
      const reason = normalizeOptionalText(payload.banned_reason)
      if (reason !== undefined) updates.banned_reason = reason
    }
  }

  if ('admin_note' in payload) {
    const adminNote = normalizeOptionalText(payload.admin_note)
    if (adminNote === undefined) {
      return NextResponse.json({ error: 'admin_note 必须为字符串' }, { status: 400 })
    }
    updates.admin_note = adminNote
    updates.last_admin_action_at = now
  }

  if ('banned_reason' in payload && !('banned_reason' in updates)) {
    const bannedReason = normalizeOptionalText(payload.banned_reason)
    if (bannedReason === undefined) {
      return NextResponse.json({ error: 'banned_reason 必须为字符串' }, { status: 400 })
    }
    updates.banned_reason = bannedReason
    updates.last_admin_action_at = now
  }

  if ('is_posting_exempt' in payload) {
    if (typeof payload.is_posting_exempt !== 'boolean') {
      return NextResponse.json({ error: 'is_posting_exempt 必须为布尔值' }, { status: 400 })
    }
    updates.is_posting_exempt = payload.is_posting_exempt
    updates.last_admin_action_at = now
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: '没有可更新的字段' }, { status: 400 })
  }

  const supabase = getServiceClient()
  let oldStatus: UserStatus | null = null

  if (requestedStatus) {
    const { data: currentUser, error: currentUserError } = await supabase
      .from('users')
      .select('status')
      .eq('id', id)
      .maybeSingle()

    if (currentUserError) {
      console.error('[admin users] failed to load current status before update', currentUserError)
    } else if (isUserStatus((currentUser as { status?: unknown } | null)?.status)) {
      oldStatus = (currentUser as { status: UserStatus }).status
    }
  }

  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', id)
    .select(
      'id, email, username, phone, bio, status, is_posting_exempt, admin_note, banned_reason, banned_at, banned_by, created_at, updated_at'
    )
    .single()

  if (error || !data) {
    return NextResponse.json({ error: '更新用户失败' }, { status: 400 })
  }

  const newStatus = isUserStatus((data as { status?: unknown }).status) ? (data as { status: UserStatus }).status : null
  if (requestedStatus && oldStatus && newStatus && oldStatus !== newStatus) {
    const notification = getStatusNotification(newStatus)
    try {
      await createNotificationForUser(supabase, {
        userId: id,
        type: 'account',
        title: notification.title,
        body: notification.body,
        linkUrl: '/profile',
        metadata: {
          source: 'admin_user_status_change',
          old_status: oldStatus,
          new_status: newStatus,
        },
      })
    } catch (notificationError) {
      console.error('[admin users] failed to create status change notification', notificationError)
    }
  }

  return NextResponse.json({ data })
}
