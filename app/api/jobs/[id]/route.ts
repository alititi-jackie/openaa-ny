import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isPublicOwnerVisible } from '@/lib/publicVisibility'
import { validateContactFields } from '@/lib/contactValidation'
import {
  assertUserCanDeleteOwnContent,
  assertUserCanEditOwnContent,
  assertUserCanHideContent,
  assertUserCanRestoreContent,
} from '@/lib/accountStatus'

export const dynamic = 'force-dynamic'

const ALLOWED_UPDATE_FIELDS = new Set([
  'type',
  'contact_name',
  'phone',
  'wechat',
  'title',
  'company',
  'description',
  'salary_min',
  'salary_max',
  'salary_unit',
  'location',
  'job_type',
  'category',
  'status',
])

type CurrentPost = {
  status: string | null
  admin_hidden: boolean | null
  phone: string | null
  wechat: string | null
}

function toObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function getDisallowedUpdateFields(body: Record<string, unknown>) {
  return Object.keys(body).filter((key) => !ALLOWED_UPDATE_FIELDS.has(key))
}

async function assertStatusPermission(
  supabase: SupabaseClient,
  userId: string,
  currentPost: CurrentPost,
  nextStatus: unknown
): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  if (nextStatus !== 'hidden' && nextStatus !== 'published') {
    return { ok: false, response: NextResponse.json({ error: 'status 只能更新为 hidden 或 published' }, { status: 400 }) }
  }

  if (currentPost.status === 'deleted') {
    return { ok: false, response: NextResponse.json({ error: '已删除内容不能恢复或编辑' }, { status: 403 }) }
  }

  if (nextStatus === 'hidden') {
    const permission = await assertUserCanHideContent(supabase, userId)
    if (!permission.allowed) {
      return { ok: false, response: NextResponse.json({ error: permission.message }, { status: 403 }) }
    }
  }

  if (nextStatus === 'published' && currentPost.status !== 'published') {
    if (currentPost.admin_hidden === true) {
      return { ok: false, response: NextResponse.json({ error: '该内容已被管理员下架，无法自行恢复。' }, { status: 403 }) }
    }

    if (currentPost.status !== 'hidden') {
      return { ok: false, response: NextResponse.json({ error: '不能直接恢复公开该内容' }, { status: 403 }) }
    }

    const permission = await assertUserCanRestoreContent(supabase, userId)
    if (!permission.allowed) {
      return { ok: false, response: NextResponse.json({ error: permission.message }, { status: 403 }) }
    }
  }

  return { ok: true }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data, error } = await supabase
    .from('job_postings')
    .select('*, user:users(username, avatar_url, status)')
    .eq('id', id)
    .eq('status', 'published')
    .single()

  if (error || !data || !isPublicOwnerVisible((data as { user?: unknown }).user)) {
    return NextResponse.json({ error: '职位不存在' }, { status: 404 })
  }
  return NextResponse.json({ data })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const authHeader = request.headers.get('Authorization')
  const token = authHeader?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: '未授权' }, { status: 401 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )

  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) return NextResponse.json({ error: '未授权' }, { status: 401 })

  const body = toObject(await request.json())
  if (!body) return NextResponse.json({ error: '无效请求体' }, { status: 400 })

  const disallowedFields = getDisallowedUpdateFields(body)
  if (disallowedFields.length > 0) {
    return NextResponse.json({ error: `不允许更新字段：${disallowedFields.join(', ')}` }, { status: 400 })
  }

  const editPermission = await assertUserCanEditOwnContent(supabase, user.id)
  if (!editPermission.allowed) {
    return NextResponse.json({ error: editPermission.message }, { status: 403 })
  }

  const { data: currentPost, error: currentPostError } = await supabase
    .from('job_postings')
    .select('status, admin_hidden, phone, wechat')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (currentPostError) return NextResponse.json({ error: currentPostError.message }, { status: 400 })
  if (!currentPost) return NextResponse.json({ error: '记录不存在或无权限' }, { status: 404 })

  if ('status' in body) {
    const result = await assertStatusPermission(supabase, user.id, currentPost as CurrentPost, body.status)
    if (!result.ok) return result.response
  }

  if ('phone' in body || 'wechat' in body) {
    const nextPhone = 'phone' in body ? String(body.phone ?? '') : ((currentPost as CurrentPost).phone ?? '')
    const nextWechat = 'wechat' in body ? String(body.wechat ?? '') : ((currentPost as CurrentPost).wechat ?? '')
    const contactCheck = validateContactFields(nextPhone, nextWechat)
    if (!contactCheck.ok) {
      return NextResponse.json({ error: contactCheck.message }, { status: 422 })
    }
  }

  const { data, error } = await supabase
    .from('job_postings')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ data })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const authHeader = request.headers.get('Authorization')
  const token = authHeader?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: '未授权' }, { status: 401 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )

  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) return NextResponse.json({ error: '未授权' }, { status: 401 })

  const permission = await assertUserCanDeleteOwnContent(supabase, user.id)
  if (!permission.allowed) {
    return NextResponse.json({ error: permission.message }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('job_postings')
    .update({ status: 'deleted', updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  if (!data) return NextResponse.json({ error: '记录不存在或无权限' }, { status: 404 })
  return NextResponse.json({ message: '职位已删除' })
}
