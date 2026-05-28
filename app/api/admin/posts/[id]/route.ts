import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createNotificationForUser } from '@/lib/notifications'

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
type NormalizedPostStatus = typeof VALID_STATUSES[number]

type PostSnapshot = {
  status: NormalizedPostStatus
  userId: string | null
  title: string
}

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

function normalizePostStatus(status: unknown, isServicePost: boolean): NormalizedPostStatus | null {
  if (isServicePost && status === 'active') return 'published'
  if ((VALID_STATUSES as readonly unknown[]).includes(status)) return status as NormalizedPostStatus
  return null
}

function getPublicPostLink(module: PostModule, id: string): string {
  if (module === 'jobs') return `/jobs/${id}`
  if (module === 'housing') return `/housing/${id}`
  if (module === 'secondhand') return `/secondhand/${id}`
  return `/services/${id}`
}

function getProfilePostListLink(module: PostModule): string {
  if (module === 'jobs') return '/profile/my-jobs'
  if (module === 'housing') return '/profile/my-housing'
  if (module === 'secondhand') return '/profile/my-items'
  return '/profile/my-services'
}

function getPostStatusNotification(
  oldStatus: NormalizedPostStatus,
  newStatus: NormalizedPostStatus,
  title: string,
  module: PostModule,
  id: string
) {
  if (oldStatus === 'published' && newStatus === 'hidden') {
    return {
      title: '帖子已下架',
      body: `你的帖子「${title}」已被管理员下架，暂时不会在公开页面展示。如有疑问，请通过“我的”页面中的“反馈与举报”联系 OpenAA 管理员。`,
      linkUrl: getProfilePostListLink(module),
    }
  }

  if (
    (oldStatus === 'hidden' || oldStatus === 'unpublished' || oldStatus === 'deleted') &&
    newStatus === 'published'
  ) {
    return {
      title: '帖子已恢复',
      body: `你的帖子「${title}」已恢复展示，其他用户现在可以正常查看。`,
      linkUrl: getPublicPostLink(module, id),
    }
  }

  if (oldStatus !== 'deleted' && newStatus === 'deleted') {
    return {
      title: '帖子已删除',
      body: `你的帖子「${title}」已被管理员删除，不再对外展示。如有疑问，请通过“我的”页面中的“反馈与举报”联系 OpenAA 管理员。`,
      linkUrl: null,
    }
  }

  return null
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

  const { module, status, is_pinned, pinned_order, pinned_until, admin_hidden_reason } = body as {
    module?: PostModule
    status?: string
    is_pinned?: boolean
    pinned_order?: number
    pinned_until?: string | null
    admin_hidden_reason?: string | null
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
  let oldPost: PostSnapshot | null = null

  if (status !== undefined) {
    const { data: currentPost, error: currentPostError } = await supabase
      .from(table)
      .select('status, user_id, title')
      .eq('id', id)
      .maybeSingle()

    if (currentPostError) {
      console.error('[admin posts] failed to load current post before status update', currentPostError)
    } else {
      const currentStatus = normalizePostStatus((currentPost as { status?: unknown } | null)?.status, isServicePost)
      if (currentStatus) {
        const userId = (currentPost as { user_id?: unknown } | null)?.user_id
        const titleValue = (currentPost as { title?: unknown } | null)?.title
        oldPost = {
          status: currentStatus,
          userId: typeof userId === 'string' && userId.trim() ? userId.trim() : null,
          title: typeof titleValue === 'string' && titleValue.trim() ? titleValue.trim() : '未命名帖子',
        }
      }
    }
  }

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

  const now = new Date().toISOString()
  const updates: Record<string, unknown> = { updated_at: now }
  if (dbStatus !== undefined) updates.status = dbStatus
  if (is_pinned !== undefined) updates.is_pinned = is_pinned
  if (normalizedPinnedOrder !== undefined) updates.pinned_order = normalizedPinnedOrder
  if (normalizedPinnedUntil !== undefined) updates.pinned_until = normalizedPinnedUntil

  if (status === 'hidden') {
    updates.admin_hidden = true
    updates.admin_hidden_at = now
    updates.admin_hidden_by = 'admin'
    updates.admin_hidden_reason =
      typeof admin_hidden_reason === 'string' && admin_hidden_reason.trim()
        ? admin_hidden_reason.trim()
        : null
    if (isServicePost) updates.is_active = false
  }

  if (status === 'published') {
    updates.admin_hidden = false
    updates.admin_hidden_at = null
    updates.admin_hidden_by = null
    updates.admin_hidden_reason = null
    if (isServicePost) updates.is_active = true
  }

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

  const normalizedData = normalizeServiceResponse(data as Record<string, unknown>, isServicePost)
  const newStatus = normalizePostStatus(normalizedData.status, isServicePost)
  if (oldPost?.userId && newStatus && oldPost.status !== newStatus) {
    const notification = getPostStatusNotification(oldPost.status, newStatus, oldPost.title, module, id)
    if (notification) {
      try {
        await createNotificationForUser(supabase, {
          userId: oldPost.userId,
          type: 'content',
          title: notification.title,
          body: notification.body,
          linkUrl: notification.linkUrl,
          metadata: {
            source: 'admin_post_status_change',
            module,
            post_id: id,
            old_status: oldPost.status,
            new_status: newStatus,
          },
        })
      } catch (notificationError) {
        console.error('[admin posts] failed to create status change notification', notificationError)
      }
    }
  }

  return NextResponse.json({ data: normalizedData })
}
