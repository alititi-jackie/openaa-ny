import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  isNotificationType,
  isPlainMetadata,
  NOTIFICATIONS_SELECT,
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
