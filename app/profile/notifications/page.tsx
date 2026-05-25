'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import BackToTopButton from '@/components/BackToTopButton'
import DetailBackButton from '@/components/DetailBackButton'
import { supabase } from '@/lib/supabase'
import type { Notification as UserNotification, NotificationType } from '@/types'

const TYPE_LABELS: Record<NotificationType, string> = {
  system: '系统',
  announcement: '公告',
  account: '账号',
  content: '内容',
  favorite: '收藏',
  dmv: 'DMV',
}

const TYPE_CLASS_NAMES: Record<NotificationType, string> = {
  system: 'bg-blue-50 text-blue-700 ring-blue-100',
  announcement: 'bg-violet-50 text-violet-700 ring-violet-100',
  account: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  content: 'bg-amber-50 text-amber-700 ring-amber-100',
  favorite: 'bg-pink-50 text-pink-700 ring-pink-100',
  dmv: 'bg-zinc-100 text-zinc-700 ring-zinc-200',
}

function formatCreatedAt(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function ProfileNotificationsPage() {
  const [items, setItems] = useState<UserNotification[]>([])
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [readingId, setReadingId] = useState<string | null>(null)
  const [markingAll, setMarkingAll] = useState(false)

  useEffect(() => {
    let mounted = true

    async function loadNotifications() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!mounted) return
      const token = session?.access_token ?? null
      setAccessToken(token)

      if (!token) {
        setLoading(false)
        return
      }

      const res = await fetch('/api/user/notifications?limit=50', {
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => null)

      if (!mounted) return
      if (!res?.ok) {
        setErrorMessage('通知加载失败，请稍后再试')
        setLoading(false)
        return
      }

      const json = (await res.json().catch(() => null)) as { data?: UserNotification[] } | null
      setItems(json?.data ?? [])
      setLoading(false)
    }

    loadNotifications()
    return () => {
      mounted = false
    }
  }, [])

  const unreadCount = useMemo(() => items.filter((item) => !item.read_at).length, [items])

  const handleMarkRead = async (item: UserNotification) => {
    if (!accessToken || item.read_at || readingId) return
    setReadingId(item.id)
    setErrorMessage('')
    try {
      const res = await fetch(`/api/user/notifications/${item.id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!res.ok) throw new Error('mark read failed')
      const now = new Date().toISOString()
      setItems((current) =>
        current.map((notification) =>
          notification.id === item.id ? { ...notification, read_at: now } : notification,
        ),
      )
    } catch {
      setErrorMessage('标记已读失败，请稍后再试')
    } finally {
      setReadingId(null)
    }
  }

  const handleMarkAllRead = async () => {
    if (!accessToken || unreadCount === 0 || markingAll) return
    setMarkingAll(true)
    setErrorMessage('')
    try {
      const res = await fetch('/api/user/notifications/read-all', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!res.ok) throw new Error('mark all read failed')
      const now = new Date().toISOString()
      setItems((current) =>
        current.map((notification) =>
          notification.read_at ? notification : { ...notification, read_at: now },
        ),
      )
    } catch {
      setErrorMessage('全部标记已读失败，请稍后再试')
    } finally {
      setMarkingAll(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 pb-24">
      <div className="mx-auto max-w-2xl px-4 py-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <DetailBackButton fallbackHref="/profile" label="← 返回我的" inToolbar forceHref />
          {accessToken && unreadCount > 0 ? (
            <button
              type="button"
              onClick={handleMarkAllRead}
              disabled={markingAll}
              className="rounded-xl border border-blue-100 bg-white px-3 py-2 text-sm font-medium text-blue-700 shadow-sm transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {markingAll ? '处理中' : '全部已读'}
            </button>
          ) : null}
        </div>

        <div className="mb-5 px-1">
          <h1 className="text-2xl font-black text-zinc-900">通知中心</h1>
          <p className="mt-1 text-sm text-zinc-500">查看与你账号、内容和平台相关的通知。</p>
        </div>

        {!accessToken && !loading ? (
          <div className="rounded-2xl border border-zinc-100 bg-white px-5 py-10 text-center shadow-sm">
            <p className="text-base font-bold text-zinc-900">请先登录后查看通知</p>
            <p className="mt-1 text-sm text-zinc-500">登录后即可查看与你账号相关的站内通知</p>
            <Link
              href="/auth/login?redirect=/profile/notifications"
              className="mt-4 inline-flex rounded-xl bg-[#1976d2] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#1565c0]"
            >
              去登录
            </Link>
          </div>
        ) : (
          <>
            {errorMessage ? <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{errorMessage}</p> : null}

            {loading ? (
              <div className="rounded-2xl border border-zinc-100 bg-white px-5 py-10 text-center text-sm text-zinc-500 shadow-sm">
                加载中...
              </div>
            ) : items.length === 0 ? (
              <div className="rounded-2xl border border-zinc-100 bg-white px-5 py-10 text-center shadow-sm">
                <p className="text-base font-bold text-zinc-900">暂无通知</p>
                <p className="mt-1 text-sm text-zinc-500">有新的账号、内容或平台通知时会显示在这里</p>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item) => {
                  const unread = !item.read_at
                  return (
                    <article
                      key={item.id}
                      className={`rounded-2xl border bg-white p-4 shadow-sm ${
                        unread ? 'border-blue-100 ring-1 ring-blue-50' : 'border-zinc-100'
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${TYPE_CLASS_NAMES[item.type]}`}>
                          {TYPE_LABELS[item.type]}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${unread ? 'bg-red-50 text-red-600' : 'bg-zinc-100 text-zinc-500'}`}>
                          {unread ? '未读' : '已读'}
                        </span>
                        <span className="text-xs text-zinc-400">{formatCreatedAt(item.created_at)}</span>
                      </div>

                      <h2 className="mt-2 line-clamp-2 text-base font-bold leading-snug text-zinc-900">{item.title}</h2>
                      <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-zinc-600">{item.body}</p>

                      <div className="mt-4 flex flex-wrap justify-end gap-2">
                        {item.link_url ? (
                          <Link
                            href={item.link_url}
                            className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-100"
                          >
                            查看详情
                          </Link>
                        ) : null}
                        {unread ? (
                          <button
                            type="button"
                            onClick={() => handleMarkRead(item)}
                            disabled={readingId === item.id}
                            className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {readingId === item.id ? '处理中' : '标记已读'}
                          </button>
                        ) : null}
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
      <BackToTopButton />
    </div>
  )
}
