import { NextRequest, NextResponse } from 'next/server'
import { authenticateUserRequest } from '@/lib/request-auth'
import { assertUserCanEditOwnContent } from '@/lib/accountStatus'

export const dynamic = 'force-dynamic'

type LinkRow = {
  id: string
  sort_order: number
}

export async function POST(request: NextRequest) {
  const auth = await authenticateUserRequest(request)
  if ('errorResponse' in auth) return auth.errorResponse

  const permission = await assertUserCanEditOwnContent(auth.supabase, auth.user.id)
  if (!permission.allowed) {
    return NextResponse.json({ error: permission.message }, { status: 403 })
  }

  const body: unknown = await request.json()
  if (body === null || typeof body !== 'object') {
    return NextResponse.json({ error: '无效请求体' }, { status: 400 })
  }

  const { id1, id2 } = body as Record<string, unknown>
  if (typeof id1 !== 'string' || typeof id2 !== 'string' || !id1 || !id2 || id1 === id2) {
    return NextResponse.json({ error: '参数无效' }, { status: 400 })
  }

  // Fetch both links and verify they belong to the current user
  const { data: linksData, error: fetchError } = await auth.supabase
    .from('user_navigation_links')
    .select('id, sort_order')
    .in('id', [id1, id2])
    .eq('user_id', auth.user.id)

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 400 })

  const links = (linksData ?? []) as LinkRow[]
  if (links.length !== 2) {
    return NextResponse.json({ error: '网址不存在或无权限' }, { status: 404 })
  }

  const link1 = links.find((l) => l.id === id1)!
  const link2 = links.find((l) => l.id === id2)!

  // Swap sort_order between the two links.
  // Updates are performed sequentially; if the second fails, we revert the first
  // to keep sort_order values consistent.
  const { error: error1 } = await auth.supabase
    .from('user_navigation_links')
    .update({ sort_order: link2.sort_order })
    .eq('id', id1)
    .eq('user_id', auth.user.id)

  if (error1) return NextResponse.json({ error: error1.message }, { status: 400 })

  const { error: error2 } = await auth.supabase
    .from('user_navigation_links')
    .update({ sort_order: link1.sort_order })
    .eq('id', id2)
    .eq('user_id', auth.user.id)

  if (error2) {
    // Revert the first update to avoid inconsistent sort_order state
    await auth.supabase
      .from('user_navigation_links')
      .update({ sort_order: link1.sort_order })
      .eq('id', id1)
      .eq('user_id', auth.user.id)
    return NextResponse.json({ error: error2.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
