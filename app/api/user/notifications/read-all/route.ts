import { NextRequest, NextResponse } from 'next/server'
import { authenticateUserRequest } from '@/lib/request-auth'

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
