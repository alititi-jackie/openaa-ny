import { NextRequest, NextResponse } from 'next/server'
import { authenticateUserRequest } from '@/lib/request-auth'
import { getServiceSupabaseServerClient } from '@/lib/serverSupabase'

export const dynamic = 'force-dynamic'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateUserRequest(request)
  if ('errorResponse' in auth) return auth.errorResponse

  const supabase = getServiceSupabaseServerClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Unable to delete notification' }, { status: 500 })
  }

  const { id } = await params
  const { data, error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', id)
    .eq('user_id', auth.user.id)
    .not('read_at', 'is', null)
    .select('id')
    .maybeSingle()

  if (error) {
    console.error('[user notifications] delete failed', error)
    return NextResponse.json({ error: 'Unable to delete notification' }, { status: 400 })
  }
  if (!data) {
    return NextResponse.json(
      { error: 'Notification not found or unread notifications cannot be deleted' },
      { status: 404 },
    )
  }

  return NextResponse.json({ success: true })
}
