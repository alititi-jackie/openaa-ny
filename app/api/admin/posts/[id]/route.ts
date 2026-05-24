import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const TABLE_MAP = {
  jobs: 'job_postings',
  housing: 'housing_posts',
  secondhand: 'secondhand_items',
  services: 'service_posts',
} as const

type PostModule = keyof typeof TABLE_MAP

// All status values accepted across modules.
// 'hidden' and 'deleted' are unlocked for jobs/secondhand by the migration
// 20260510220000_add_hidden_deleted_status_to_posts.sql.
// 'unpublished' is kept for backward-compat with pre-migration rows.
const VALID_STATUSES = ['published', 'hidden', 'deleted', 'unpublished'] as const

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

function toPinnedOrder(value: unknown): number | null | undefined {
  if (value === undefined) return undefined
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) return null
  return value
}

function toPinnedUntil(value: unknown): string | null | undefined {
  if (value === undefined) return undefined
  if (value === null) return null
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = new Date(trimmed)
  if (Number.isNaN(parsed.getTime())) return undefined
  return parsed.toISOString()
}

function normalizeServiceResponse<T extends Record<string, unknown>>(data: T, isServicePost: boolean): T {
  if (!isServicePost || data.status !== 'active') return data
  return { ...data, status: 'published' }
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

  const { module, status, is_pinned, pinned_order, pinned_until } = body as {
    module?: PostModule
    status?: string
    is_pinned?: boolean
    pinned_order?: number
    pinned_until?: string | null
  }

  if (!module || !Object.keys(TABLE_MAP).includes(module)) {
    return NextResponse.json({ error: '无效的模块名，必须为 jobs、housing、secondhand 或 services' }, { status: 400 })
  }

  if (status !== undefined && !(VALID_STATUSES as readonly string[]).includes(status)) {
    return NextResponse.json(
      { error: `无效的状态值，允许值为：${VALID_STATUSES.join('、')}` },
      { status: 400 }
    )
  }

  if (is_pinned !== undefined && typeof is_pinned !== 'boolean') {
    return NextResponse.json({ error: 'is_pinned 必须为布尔值' }, { status: 400 })
  }

  const normalizedPinnedOrder = toPinnedOrder(pinned_order)
  if (pinned_order !== undefined && normalizedPinnedOrder === null) {
    return NextResponse.json({ error: 'pinned_order 必须是大于等于 0 的整数' }, { status: 400 })
  }

  const normalizedPinnedUntil = toPinnedUntil(pinned_until)
  if (pinned_until !== undefined && normalizedPinnedUntil === undefined) {
    return NextResponse.json({ error: 'pinned_until 必须是合法时间或空值' }, { status: 400 })
  }

  if (
    status === undefined &&
    is_pinned === undefined &&
    normalizedPinnedOrder === undefined &&
    normalizedPinnedUntil === undefined
  ) {
    return NextResponse.json({ error: '至少需要提供一个可更新字段' }, { status: 400 })
  }

  const table = TABLE_MAP[module as PostModule]
  const supabase = getServiceClient()
  const isServicePost = module === 'services'
  const dbStatus = isServicePost && status === 'published' ? 'active' : status

  // Prevent setting is_pinned=true on a non-published post.
  if (is_pinned === true) {
    if (status !== undefined && status !== 'published') {
      return NextResponse.json({ error: '只有显示中的帖子才能设置置顶。' }, { status: 400 })
    }
    if (status === undefined) {
      // Status not changing in this request – check current status in DB.
      const { data: currentPost } = await supabase
        .from(table)
        .select('status')
        .eq('id', id)
        .single()
      const currentStatus = (currentPost as { status: string } | null)?.status
      const currentIsVisible = isServicePost ? currentStatus === 'active' : currentStatus === 'published'
      if (!currentPost || !currentIsVisible) {
        return NextResponse.json({ error: '只有显示中的帖子才能设置置顶。' }, { status: 400 })
      }
    }
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (dbStatus !== undefined) updates.status = dbStatus
  if (is_pinned !== undefined) updates.is_pinned = is_pinned
  if (normalizedPinnedOrder !== undefined) updates.pinned_order = normalizedPinnedOrder
  if (normalizedPinnedUntil !== undefined) updates.pinned_until = normalizedPinnedUntil

  // When changing to a non-published status, automatically clear all pinned fields.
  if (status !== undefined && status !== 'published') {
    updates.is_pinned = false
    updates.pinned_until = null
    updates.pinned_order = 0
  }

  const { data, error } = await supabase
    .from(table)
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ data: normalizeServiceResponse(data as Record<string, unknown>, isServicePost) })
}
