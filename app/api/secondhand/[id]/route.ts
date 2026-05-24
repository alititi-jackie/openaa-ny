import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateContactFields } from '@/lib/contactValidation'
import { isPublicOwnerVisible } from '@/lib/publicVisibility'
import {
  assertUserCanDeleteOwnContent,
  assertUserCanEditOwnContent,
  assertUserCanHideContent,
} from '@/lib/accountStatus'

export const dynamic = 'force-dynamic'

function hasPublicStateMutation(body: unknown): boolean {
  return Boolean(body && typeof body === 'object' && ('status' in body || 'is_active' in body))
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
    .from('secondhand_items')
    .select('*, user:users(username, avatar_url, status)')
    .eq('id', id)
    .eq('status', 'published')
    .single()

  if (error || !data || !isPublicOwnerVisible((data as { user?: unknown }).user)) {
    return NextResponse.json({ error: '商品不存在' }, { status: 404 })
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

  const body = await request.json()
  const editPermission = await assertUserCanEditOwnContent(supabase, user.id)
  if (!editPermission.allowed) {
    return NextResponse.json({ error: editPermission.message }, { status: 403 })
  }

  if (hasPublicStateMutation(body)) {
    const statePermission = await assertUserCanHideContent(supabase, user.id)
    if (!statePermission.allowed) {
      return NextResponse.json({ error: statePermission.message }, { status: 403 })
    }
  }

  if ('phone' in body || 'wechat' in body) {
    const contactCheck = validateContactFields(body?.phone ?? '', body?.wechat ?? '')
    if (!contactCheck.ok) {
      return NextResponse.json({ error: contactCheck.message }, { status: 422 })
    }
  }
  const { data, error } = await supabase
    .from('secondhand_items')
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

  const { error } = await supabase
    .from('secondhand_items')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ message: '商品已删除' })
}
