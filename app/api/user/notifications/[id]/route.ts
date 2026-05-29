import { NextRequest, NextResponse } from 'next/server'
import { authenticateUserRequest } from '@/lib/request-auth'

export const dynamic = 'force-dynamic'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateUserRequest(request)
  if ('errorResponse' in auth) return auth.errorResponse

  const { id } = await params
  const { data, error } = await auth.supabase
    .from('notifications')
    .delete()
    .eq('id', id)
    .eq('user_id', auth.user.id)
    .not('read_at', 'is', null)
    .select('id')
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  if (!data) {
    return NextResponse.json(
      { error: 'Notification not found or unread notifications cannot be deleted' },
      { status: 404 },
    )
  }

  return NextResponse.json({ success: true })
}
