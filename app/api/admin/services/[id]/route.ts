import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

  const { status, is_active, is_pinned, pinned_order, pinned_until, admin_hidden_reason } = body as {
    status?: string
    is_active?: boolean
    is_pinned?: boolean
    pinned_order?: number
    pinned_until?: string | null
    admin_hidden_reason?: string | null
  }

  const VALID_STATUSES = ['active', 'hidden', 'deleted']
  if (status !== undefined && !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: '无效的状态值' }, { status: 400 })
  }

  if (is_active !== undefined && typeof is_active !== 'boolean') {
    return NextResponse.json({ error: 'is_active 必须为布尔值' }, { status: 400 })
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

  const now = new Date().toISOString()
  const updates: Record<string, unknown> = {
    updated_at: now,
  }
  if (status !== undefined) updates.status = status
  if (is_active !== undefined) updates.is_active = is_active
  if (is_pinned !== undefined) updates.is_pinned = is_pinned
  if (normalizedPinnedOrder !== undefined) updates.pinned_order = normalizedPinnedOrder
  if (normalizedPinnedUntil !== undefined) updates.pinned_until = normalizedPinnedUntil

  if (status === 'hidden') {
    updates.is_active = false
    updates.admin_hidden = true
    updates.admin_hidden_at = now
    updates.admin_hidden_by = 'admin'
    updates.admin_hidden_reason =
      typeof admin_hidden_reason === 'string' && admin_hidden_reason.trim()
        ? admin_hidden_reason.trim()
        : null
  }

  if (status === 'active') {
    updates.is_active = true
    updates.admin_hidden = false
    updates.admin_hidden_at = null
    updates.admin_hidden_by = null
    updates.admin_hidden_reason = null
  }

  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from('service_posts')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ data })
}
