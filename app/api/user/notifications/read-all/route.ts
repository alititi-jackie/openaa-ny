import { NextRequest, NextResponse } from 'next/server'
import { authenticateUserRequest } from '@/lib/request-auth'
import { getServiceSupabaseServerClient } from '@/lib/serverSupabase'

export const dynamic = 'force-dynamic'

export async function PATCH(request: NextRequest) {
  const auth = await authenticateUserRequest(request)
  if ('errorResponse' in auth) return auth.errorResponse

  const now = new Date().toISOString()
  const { error } = await auth.supabase
    .from('notifications')
    .update({ read_at: now })
    .eq('user_id', auth.user.id)
    .is('read_at', null)
    .or(`expires_at.is.null,expires_at.gt.${now}`)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}

export async function DELETE(request: NextRequest) {
  const auth = await authenticateUserRequest(request)
  if ('errorResponse' in auth) return auth.errorResponse

  const supabase = getServiceSupabaseServerClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Unable to delete notifications' }, { status: 500 })
  }

  const { data, error } = await supabase
    .from('notifications')
    .delete()
    .eq('user_id', auth.user.id)
    .not('read_at', 'is', null)
    .select('id')

  if (error) {
    console.error('[user notifications] delete read all failed', error)
    return NextResponse.json({ error: 'Unable to delete notifications' }, { status: 400 })
  }
  return NextResponse.json({ success: true, deleted_count: data?.length ?? 0 })
}
