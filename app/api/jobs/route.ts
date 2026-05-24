import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateContactFields } from '@/lib/contactValidation'
import { isPublicOwnerVisible } from '@/lib/publicVisibility'
import { assertUserCanCreateContent } from '@/lib/accountStatus'
import { clampPageSize, parsePageParam } from '@/lib/api/params'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')?.trim() || null
  const job_type = searchParams.get('job_type')?.trim() || null
  const type = searchParams.get('type')?.trim() || null
  const page = parsePageParam(searchParams.get('page'))
  const pageSize = clampPageSize(searchParams.get('pageSize'), 20, 50)

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  let query = supabase
    .from('job_postings')
    .select('*, user:users(username, status)', { count: 'exact' })
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (type) query = query.eq('type', type)
  if (category) query = query.eq('category', category)
  if (job_type) query = query.eq('job_type', job_type)

  const { data, error, count } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  const visibleData = (data ?? []).filter((row) => isPublicOwnerVisible((row as { user?: unknown }).user))
  return NextResponse.json({ data: visibleData, total: count, page, pageSize })
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('Authorization')
  const token = authHeader?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: '未授权' }, { status: 401 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser(token)
  if (!user) return NextResponse.json({ error: '未授权' }, { status: 401 })

  const permission = await assertUserCanCreateContent(supabase, user.id)
  if (!permission.allowed) {
    return NextResponse.json({ error: permission.message }, { status: 403 })
  }

  const body = await request.json()
  const normalizedType = body?.type === 'seeking' ? 'seeking' : 'hiring'

  const contactCheck = validateContactFields(body?.phone ?? '', body?.wechat ?? '')
  if (!contactCheck.ok) {
    return NextResponse.json({ error: contactCheck.message }, { status: 422 })
  }

  const { data, error } = await supabase
    .from('job_postings')
    .insert({ ...body, type: normalizedType, user_id: user.id, status: 'published', views: 0 })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ data }, { status: 201 })
}
