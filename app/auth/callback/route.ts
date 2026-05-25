import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { resolveRedirectPath } from '@/lib/user-navigation'
import { getMetadataAvatarUrl } from '@/lib/avatar'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const redirectPath = resolveRedirectPath(
    requestUrl.searchParams.get('redirect'),
    requestUrl.searchParams.get('redirectTo'),
    requestUrl.searchParams.get('next'),
  )

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (code && supabaseUrl && supabaseAnonKey) {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    const { data } = await supabase.auth.exchangeCodeForSession(code)
    const user = data.user
    const metadataAvatarUrl = getMetadataAvatarUrl(user?.user_metadata)
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (user && metadataAvatarUrl && serviceRoleKey) {
      const serviceSupabase = createClient(supabaseUrl, serviceRoleKey)
      const { data: profile } = await serviceSupabase
        .from('users')
        .select('id, avatar_url')
        .eq('id', user.id)
        .maybeSingle()

      if (profile) {
        if (!profile.avatar_url) {
          await serviceSupabase
            .from('users')
            .update({
              avatar_url: metadataAvatarUrl,
              updated_at: new Date().toISOString(),
            })
            .eq('id', user.id)
            .is('avatar_url', null)
        }
      } else {
        await serviceSupabase.from('users').insert({
          id: user.id,
          email: user.email ?? '',
          username: user.user_metadata?.username ?? user.email?.split('@')[0] ?? '用户',
          avatar_url: metadataAvatarUrl,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
      }
    }
  }

  const finalRedirectPath = redirectPath === '/profile' ? '/' : redirectPath
  return NextResponse.redirect(new URL(finalRedirectPath, requestUrl.origin))
}
