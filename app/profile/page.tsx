'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronDown,
  ChevronUp,
  ShoppingBag,
  Briefcase,
  Home,
  PlusSquare,
  Share2,
  Bell,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import ProfileHeader from '@/components/ProfileHeader'
import type { UserProfile } from '@/types'
import A2HSButton, { IosA2HSModal } from '@/components/A2HSButton'
import { shareOpenAA } from '@/lib/share'
import { getMetadataAvatarUrl } from '@/lib/avatar'

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [publishOpen, setPublishOpen] = useState(false)
  const [iosA2hsOpen, setIosA2hsOpen] = useState(false)
  const [toast, setToast] = useState<string>('')
  const [unreadNotifications, setUnreadNotifications] = useState(0)

  const showToast = (message: string, durationMs = 1800) => {
    setToast(message)
    setTimeout(() => setToast(''), durationMs)
  }

  useEffect(() => {
    const fetchProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      // Guest mode: do NOT redirect; keep page visible
      if (!user) {
        setProfile(null)
        setUnreadNotifications(0)
        setLoading(false)
        return
      }

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session?.access_token) {
        const res = await fetch('/api/user/notifications?limit=1', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }).catch(() => null)
        const json = (await res?.json().catch(() => null)) as { unread_count?: number } | null
        setUnreadNotifications(res?.ok ? json?.unread_count ?? 0 : 0)
      } else {
        setUnreadNotifications(0)
      }

      const { data } = await supabase.from('users').select('*').eq('id', user.id).single()
      const metadataAvatarUrl = getMetadataAvatarUrl(user.user_metadata)

      if (data) {
        if (!data.avatar_url && metadataAvatarUrl) {
          const { data: updatedProfile } = await supabase
            .from('users')
            .update({
              avatar_url: metadataAvatarUrl,
              updated_at: new Date().toISOString(),
            })
            .eq('id', user.id)
            .is('avatar_url', null)
            .select('*')
            .single()

          setProfile((updatedProfile ?? data) as UserProfile)
        } else {
          setProfile(data)
        }
      }
      else {
        const newProfile = {
          id: user.id,
          email: user.email ?? '',
          username: user.user_metadata?.username ?? user.email?.split('@')[0] ?? '用户',
          avatar_url: metadataAvatarUrl ?? undefined,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        await supabase.from('users').insert(newProfile)
        setProfile(newProfile)
      }

      setLoading(false)
    }

    fetchProfile()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const handleShare = async () => {
    const res = await shareOpenAA()
    if (res === 'copied') {
      showToast('✅ 链接已复制')
    }
  }

  if (loading) return <div className="flex justify-center py-20 text-zinc-500">加载中...</div>

  return (
    <div className="min-h-screen bg-zinc-100">
      <div className="mx-auto max-w-[560px] px-4 pt-6 pb-6 space-y-4">
        <div className="px-1">
          <h1 className="text-[18px] font-black text-zinc-900 tracking-tight">OpenAA 用户中心</h1>
          <p className="mt-1 text-[12px] text-zinc-500">管理我的信息与发布入口</p>
        </div>

        {profile ? (
          <ProfileHeader profile={profile} />
        ) : (
          <div className="bg-white rounded-2xl shadow-[0_2px_14px_rgba(0,0,0,0.06)] ring-1 ring-black/5 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[13px] font-black text-zinc-900">未登录</div>
                <div className="text-[11px] text-zinc-500 mt-0.5">登录后可管理发布与个人信息</div>
              </div>
              <Link
                href="/auth/login"
                className="rounded-2xl bg-zinc-900 text-white font-bold text-[13px] px-4 py-2"
              >
                登录
              </Link>
            </div>
          </div>
        )}

        <div className="px-1 space-y-3">
          <div>
            <h2 className="text-[14px] font-black text-zinc-900 tracking-tight">快捷操作</h2>
          </div>

          <div className="grid grid-cols-2 max-[359px]:grid-cols-1 gap-3">
            <A2HSButton
              onIosNeedInstructions={() => setIosA2hsOpen(true)}
              onAlreadyInstalled={() =>
                showToast('OpenAA 已经添加到桌面了，无需重复添加。', 2400)
              }
              className="text-left rounded-2xl border border-blue-100 bg-white p-3.5 shadow-[0_8px_24px_rgba(15,23,42,0.08)] transition-all duration-200 hover:shadow-[0_12px_28px_rgba(15,23,42,0.12)] active:scale-[0.98] disabled:opacity-60 disabled:hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50">
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white shadow-sm">
                    <PlusSquare size={18} className="text-blue-600" />
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="text-[12px] font-bold leading-tight text-blue-600">OpenAA</div>
                  <div className="mt-1 text-[13px] font-semibold leading-tight text-slate-900">
                    添加到桌面
                  </div>
                </div>
              </div>
            </A2HSButton>

            <button
              type="button"
              onClick={handleShare}
              className="text-left rounded-2xl border border-orange-100 bg-white p-3.5 shadow-[0_8px_24px_rgba(15,23,42,0.08)] transition-all duration-200 hover:shadow-[0_12px_28px_rgba(15,23,42,0.12)] active:scale-[0.98]"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-50">
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white shadow-sm">
                    <Share2 size={17} className="text-orange-500" />
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="text-[12px] font-bold leading-tight text-blue-600">OpenAA</div>
                  <div className="mt-1 text-[13px] font-semibold leading-tight text-slate-900">
                    分享给朋友
                  </div>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Menu */}
        <div className="bg-white rounded-2xl shadow-[0_2px_14px_rgba(0,0,0,0.06)] ring-1 ring-black/5 overflow-hidden">
          <div className="grid grid-cols-2 border-b border-zinc-100">
            <Link
              href="/profile/favorites"
              aria-label="我的收藏 - 查看你收藏的招聘、房屋、二手、服务和新闻"
              className="min-w-0 border-r border-zinc-100 p-4 transition hover:bg-zinc-50"
            >
              <p className="text-sm font-medium text-zinc-900">我的收藏</p>
              <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-zinc-500">查看你收藏的招聘、房屋、二手、服务和新闻</p>
            </Link>

            <Link
              href="/profile/recent"
              aria-label="最近浏览 - 查看你最近看过的内容"
              className="min-w-0 p-4 transition hover:bg-zinc-50"
            >
              <p className="text-sm font-medium text-zinc-900">最近浏览</p>
              <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-zinc-500">查看你最近看过的内容</p>
            </Link>
          </div>

          {/* 通知中心 */}
          <Link
            href="/profile/notifications"
            aria-label="通知中心 - 查看账号、内容和平台相关通知"
            className="w-full flex items-center justify-between gap-3 p-4 hover:bg-zinc-50 transition border-b border-zinc-100"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-blue-50">
                <Bell size={17} className="text-blue-600" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-zinc-900">通知中心</p>
                  {unreadNotifications > 0 ? (
                    <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold leading-none text-white">
                      {unreadNotifications > 99 ? '99+' : unreadNotifications}
                    </span>
                  ) : null}
                </div>
                <p className="mt-0.5 line-clamp-1 text-[11px] text-zinc-500">查看账号、内容和平台相关通知</p>
              </div>
            </div>
            <span className="shrink-0 text-zinc-300">›</span>
          </Link>

          {/* 管理我的导航 */}
          <Link
            href="/navigation/my"
            aria-label="管理我的导航 - 添加和整理自己的常用网站"
            className="w-full flex items-center justify-between p-4 hover:bg-zinc-50 transition border-b border-zinc-100"
          >
            <div className="flex items-center gap-2">
              <span className="text-zinc-900 font-medium">🧭 管理我的导航</span>
              <span className="text-[11px] text-zinc-400">添加和整理自己的常用网站</span>
            </div>
            <span className="text-zinc-300">›</span>
          </Link>

          {/* 我要发布 (expand) */}
          <button
            type="button"
            onClick={() => setPublishOpen((v) => !v)}
            className="w-full flex items-center justify-between p-4 hover:bg-zinc-50 transition border-b border-zinc-100"
          >
            <div className="flex items-center gap-2">
              <span className="text-zinc-900 font-medium">🚀 我要发布</span>
              <span className="text-[11px] text-zinc-400">招聘 / 房屋 / 二手 / 服务</span>
            </div>
            {publishOpen ? (
              <ChevronUp size={18} className="text-zinc-400" />
            ) : (
              <ChevronDown size={18} className="text-zinc-400" />
            )}
          </button>

          {publishOpen && (
            <div className="px-4 pb-4 pt-2 border-b border-zinc-100">
              <div className="grid grid-cols-2 gap-3">
                <Link
                  href="/jobs/publish"
                  className="text-left rounded-2xl p-3 bg-zinc-50 ring-1 ring-zinc-100 hover:bg-white hover:ring-zinc-200 transition"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 ring-1 ring-blue-100 flex items-center justify-center">
                      <Briefcase size={18} className="text-blue-600" />
                    </div>
                    <div>
                      <div className="text-[13px] font-black text-zinc-900">发布招聘</div>
                      <div className="text-[11px] text-zinc-500 mt-0.5">去发布职位</div>
                    </div>
                  </div>
                </Link>

                <Link
                  href="/housing/publish"
                  className="text-left rounded-2xl p-3 bg-zinc-50 ring-1 ring-zinc-100 hover:bg-white hover:ring-zinc-200 transition"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 ring-1 ring-emerald-100 flex items-center justify-center">
                      <Home size={18} className="text-emerald-600" />
                    </div>
                    <div>
                      <div className="text-[13px] font-black text-zinc-900">发布房屋</div>
                      <div className="text-[11px] text-zinc-500 mt-0.5">去发布房源</div>
                    </div>
                  </div>
                </Link>

                <Link
                  href="/secondhand/publish"
                  className="text-left rounded-2xl p-3 bg-zinc-50 ring-1 ring-zinc-100 hover:bg-white hover:ring-zinc-200 transition"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-amber-50 ring-1 ring-amber-100 flex items-center justify-center">
                      <ShoppingBag size={18} className="text-amber-600" />
                    </div>
                    <div>
                      <div className="text-[13px] font-black text-zinc-900">发布二手</div>
                      <div className="text-[11px] text-zinc-500 mt-0.5">去发布商品</div>
                    </div>
                  </div>
                </Link>

                <Link
                  href="/services/publish"
                  className="text-left rounded-2xl p-3 bg-zinc-50 ring-1 ring-zinc-100 hover:bg-white hover:ring-zinc-200 transition"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-cyan-50 ring-1 ring-cyan-100 flex items-center justify-center">
                      <span className="text-base leading-none">🛠️</span>
                    </div>
                    <div>
                      <div className="text-[13px] font-black text-zinc-900">发布服务</div>
                      <div className="text-[11px] text-zinc-500 mt-0.5">去发布服务</div>
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          )}

          {/* Menu order (2-column grid) */}
          <div className="grid grid-cols-2 border-b border-zinc-100">
            <Link
              href="/profile/my-jobs"
              className="flex items-center justify-between p-4 hover:bg-zinc-50 transition border-r border-zinc-100"
            >
              <span className="text-zinc-900">💼 我的招聘</span>
              <span className="text-zinc-300">›</span>
            </Link>

            <Link
              href="/profile/my-housing"
              className="flex items-center justify-between p-4 hover:bg-zinc-50 transition"
            >
              <span className="text-zinc-900">🏠 我的房屋</span>
              <span className="text-zinc-300">›</span>
            </Link>

            <Link
              href="/profile/my-items"
              className="flex items-center justify-between p-4 hover:bg-zinc-50 transition border-t border-r border-zinc-100"
            >
              <span className="text-zinc-900">🛍️ 我的二手</span>
              <span className="text-zinc-300">›</span>
            </Link>

            <Link
              href="/profile/my-services"
              className="flex items-center justify-between p-4 hover:bg-zinc-50 transition border-t border-zinc-100"
            >
              <span className="text-zinc-900">🛠️ 我的服务</span>
              <span className="text-zinc-300">›</span>
            </Link>
          </div>

          <Link
            href="/feedback"
            className="flex items-center justify-between p-4 hover:bg-zinc-50 transition border-b border-zinc-100"
          >
            <div>
              <p className="text-zinc-900">📝 反馈与举报</p>
              <p className="mt-0.5 text-[11px] text-zinc-500">提交问题、举报虚假信息或提出建议</p>
            </div>
            <span className="text-zinc-300">›</span>
          </Link>

          <Link
            href="/profile/edit"
            className="flex items-center justify-between p-4 hover:bg-zinc-50 transition border-b border-zinc-100"
          >
            <span className="text-zinc-900">✏️ 编辑资料</span>
            <span className="text-zinc-300">›</span>
          </Link>

          {profile ? (
            <button
              onClick={handleLogout}
              className="w-full p-4 hover:bg-red-50 transition"
            >
              <span className="block w-full text-center text-red-600 font-medium">退出登录</span>
            </button>
          ) : (
            <div className="p-4 text-[12px] text-zinc-400">登录后可使用更多功能</div>
          )}
        </div>
      </div>

      {/* 平台公告 */}
      <div className="mx-auto max-w-[560px] px-4 pb-24 space-y-3">
        <Link
          href={`/news?category=${encodeURIComponent('平台公告')}`}
          aria-label="查看平台公告和最新规则更新"
          className="block bg-blue-50 border border-blue-100 rounded-2xl px-4 py-4 text-center hover:bg-blue-100 transition"
        >
          <p className="text-[14px] font-bold text-blue-700">平台公告</p>
          <p className="mt-1 text-[12px] text-blue-500">查看 OpenAA 最新规则与更新</p>
        </Link>

        <Link
          href="https://openaa.com/about/"
          aria-label="查看关于 OpenAA"
          className="block bg-blue-50 border border-blue-100 rounded-2xl px-4 py-4 text-center hover:bg-blue-100 transition"
        >
          <p className="text-[14px] font-bold text-blue-700">关于 OpenAA</p>
        </Link>
      </div>

      {toast ? (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-24 z-[110]">
          <div className="rounded-full bg-zinc-900 text-white text-[12px] font-semibold px-4 py-2 shadow-lg">
            {toast}
          </div>
        </div>
      ) : null}

      <IosA2HSModal open={iosA2hsOpen} onClose={() => setIosA2hsOpen(false)} />
    </div>
  )
}
