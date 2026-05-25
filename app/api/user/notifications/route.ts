import { NextRequest, NextResponse } from 'next/server'
import { authenticateUserRequest } from '@/lib/request-auth'
import { isNotificationType, NOTIFICATIONS_SELECT, type NotificationType } from '@/lib/notifications'

export const dynamic = 'force-dynamic'

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 50

function parsePagination(value: string | null, fallback: number, min: number, max?: number) {
  if (!value) return fallback
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < min) return fallback
  return typeof max === 'number' ? Math.min(parsed, max) : parsed
}

export async function GET(request: NextRequest) {
  const auth = await authenticateUserRequest(request)
  if ('errorResponse' in auth) return auth.errorResponse

  const searchParams = request.nextUrl.searchParams
  const limit = parsePagination(searchParams.get('limit'), DEFAULT_LIMIT, 1, MAX_LIMIT)
  const offset = parsePagination(searchParams.get('offset'), 0, 0)
  const unreadOnly = searchParams.get('unread') === '1'
  const typeParam = searchParams.get('type')
  let notificationType: NotificationType | null = null

  if (typeParam) {
    if (!isNotificationType(typeParam)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }
    notificationType = typeParam
  }

  const now = new Date().toISOString()
  let query = auth.supabase
    .from('notifications')
    .select(NOTIFICATIONS_SELECT)
    .eq('user_id', auth.user.id)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (notificationType) {
    query = query.eq('type', notificationType)
  }
  if (unreadOnly) {
    query = query.is('read_at', null)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  let unreadCountQuery = auth.supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', auth.user.id)
    .is('read_at', null)
    .or(`expires_at.is.null,expires_at.gt.${now}`)

  if (notificationType) {
    unreadCountQuery = unreadCountQuery.eq('type', notificationType)
  }

  const { count, error: countError } = await unreadCountQuery
  if (countError) return NextResponse.json({ error: countError.message }, { status: 400 })

  return NextResponse.json({ data: data ?? [], unread_count: count ?? 0 })
}
