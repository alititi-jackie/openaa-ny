'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import AdminPageHeader from '@/components/AdminPageHeader'
import BackToTopButton from '@/components/BackToTopButton'
import { clearAdminToken, getAdminToken, setAdminToken } from '@/lib/adminToken'
import type { Notification as UserNotification, NotificationType } from '@/types'

type ReadStatusFilter = 'all' | 'unread' | 'read'
type TypeFilter = 'all' | NotificationType

type AdminNotification = UserNotification & {
  user: {
    id: string
    email: string | null
    username: string | null
  }
}

type NotificationsResponse = {
  data?: AdminNotification[]
  total?: number
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasPrev: boolean
    hasNext: boolean
  }
  error?: string
}

const LIMIT = 20

const TYPE_OPTIONS: Array<{ value: TypeFilter; label: string }> = [
  { value: 'all', label: '全部类型' },
  { value: 'system', label: '系统' },
  { value: 'announcement', label: '公告' },
  { value: 'account', label: '账号' },
  { value: 'content', label: '内容' },
  { value: 'favorite', label: '收藏' },
  { value: 'dmv', label: 'DMV' },
]

const READ_STATUS_OPTIONS: Array<{ value: ReadStatusFilter; label: string }> = [
  { value: 'all', label: '全部状态' },
  { value: 'unread', label: '未读' },
  { value: 'read', label: '已读' },
]

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

function formatDate(value: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function userLabel(item: AdminNotification): string {
  return item.user?.username || item.user?.email || item.user_id
}

export default function AdminNotificationsPage() {
  const [token, setToken] = useState('')
  const [inputToken, setInputToken] = useState('')
  const [showTokenEditor, setShowTokenEditor] = useState(false)
  const [items, setItems] = useState<AdminNotification[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [readStatus, setReadStatus] = useState<ReadStatusFilter>('all')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchNotifications = useCallback(
    async (nextToken = token) => {
      if (!nextToken) return
      setLoading(true)
      setMessage('')

      const params = new URLSearchParams({
        page: String(page),
        limit: String(LIMIT),
        read_status: readStatus,
      })
      const trimmedSearch = search.trim()
      if (trimmedSearch) params.set('search', trimmedSearch)
      if (typeFilter !== 'all') params.set('type', typeFilter)

      try {
        const res = await fetch(`/api/admin/notifications?${params.toString()}`, {
          headers: { 'x-admin-token': nextToken },
          cache: 'no-store',
        })
        const json = (await res.json()) as NotificationsResponse
        if (!res.ok) {
          setMessage(json.error || '获取通知列表失败')
          if (res.status === 401) setShowTokenEditor(true)
          return
        }

        setItems(Array.isArray(json.data) ? json.data : [])
        setTotal(json.total ?? 0)
        setTotalPages(json.pagination?.totalPages ?? 1)
      } catch {
        setMessage('网络错误，请稍后重试')
      } finally {
        setLoading(false)
      }
    },
    [page, readStatus, search, token, typeFilter]
  )

  useEffect(() => {
    const stored = getAdminToken()
    if (stored) {
      setToken(stored)
      setInputToken(stored)
    }
  }, [])

  useEffect(() => {
    if (token) void fetchNotifications(token)
  }, [fetchNotifications, token])

  function saveToken() {
    const nextToken = inputToken.trim()
    if (!nextToken) {
      setMessage('请输入 Admin Token')
      return
    }
    setAdminToken(nextToken)
    setToken(nextToken)
    setInputToken(nextToken)
    setShowTokenEditor(false)
    setPage(1)
    setMessage('')
  }

  function logoutAdmin() {
    clearAdminToken()
    setToken('')
    setInputToken('')
    setShowTokenEditor(false)
    setItems([])
    setMessage('')
  }

  async function deleteNotification(item: AdminNotification) {
    if (!token || deletingId) return
    const confirmed = window.confirm(`确定删除通知“${item.title}”吗？此操作不可恢复。`)
    if (!confirmed) return

    setDeletingId(item.id)
    setMessage('')
    try {
      const res = await fetch(`/api/admin/notifications/${item.id}`, {
        method: 'DELETE',
        headers: { 'x-admin-token': token },
      })
      const json = (await res.json().catch(() => null)) as { error?: string } | null
      if (!res.ok) {
        setMessage(json?.error || '删除通知失败')
        return
      }
      setItems((current) => current.filter((notification) => notification.id !== item.id))
      const nextTotal = Math.max(0, total - 1)
      setTotal(nextTotal)
      setTotalPages(Math.max(1, Math.ceil(nextTotal / LIMIT)))
      setMessage('通知已删除')
      if (items.length === 1 && page > 1) {
        setPage((current) => Math.max(1, current - 1))
      }
    } catch {
      setMessage('网络错误，请稍后重试')
    } finally {
      setDeletingId(null)
    }
  }

  if (!token) {
    return (
      <>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <AdminPageHeader title="通知管理" description="查看已发送通知、已读状态和删除通知。" />
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 md:p-6">
            <h2 className="text-lg font-semibold text-zinc-900">OpenAA 管理后台</h2>
            <p className="mt-1 text-sm text-zinc-600">请输入 Admin Token 进入通知管理。</p>
            <label className="mt-4 block text-sm font-medium text-zinc-700">Admin Token</label>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <input
                type="password"
                value={inputToken}
                onChange={(event) => setInputToken(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') saveToken()
                }}
                placeholder="Admin Token"
                className="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={saveToken}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                进入后台
              </button>
            </div>
            {message ? <p className="mt-2 text-sm text-red-500">{message}</p> : null}
          </div>
        </div>
        <BackToTopButton />
      </>
    )
  }

  return (
    <>
      <div className="mx-auto max-w-5xl px-4 py-8">
        <AdminPageHeader
          title="通知管理"
          description="查看已发送通知、已读状态和删除通知。"
          isLoggedIn={Boolean(token)}
          onLogout={logoutAdmin}
          onChangeToken={() => setShowTokenEditor((current) => !current)}
        />

        {showTokenEditor ? (
          <div className="mb-6 rounded-2xl border border-zinc-200 bg-white p-4">
            <label className="block text-sm font-medium text-zinc-700">更换 Admin Token</label>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <input
                type="password"
                value={inputToken}
                onChange={(event) => setInputToken(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') saveToken()
                }}
                placeholder="输入新的 Admin Token"
                className="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={saveToken}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                保存 Token
              </button>
            </div>
          </div>
        ) : null}

        <div className="rounded-2xl border border-zinc-200 bg-white p-4">
          <div className="grid gap-3 md:grid-cols-[1fr_180px_180px]">
            <input
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
              placeholder="搜索标题 / 内容 / 用户邮箱 / 昵称"
              className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
            <select
              value={typeFilter}
              onChange={(event) => {
                setTypeFilter(event.target.value as TypeFilter)
                setPage(1)
              }}
              className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            >
              {TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              value={readStatus}
              onChange={(event) => {
                setReadStatus(event.target.value as ReadStatusFilter)
                setPage(1)
              }}
              className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            >
              {READ_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {message ? (
          <p className={`mt-4 text-sm ${message.includes('已') ? 'text-emerald-600' : 'text-red-500'}`}>
            {message}
          </p>
        ) : null}
        {loading ? <p className="mt-4 text-sm text-zinc-500">加载中...</p> : null}

        <div className="mt-5 space-y-4">
          {!loading && items.length === 0 ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-center text-sm text-zinc-400">
              暂无符合条件的通知
            </div>
          ) : null}

          {items.map((item) => {
            const unread = !item.read_at
            return (
              <div key={item.id} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${TYPE_CLASS_NAMES[item.type]}`}>
                        {TYPE_LABELS[item.type]}
                      </span>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${unread ? 'bg-red-50 text-red-600' : 'bg-zinc-100 text-zinc-500'}`}>
                        {unread ? '未读' : '已读'}
                      </span>
                      <span className="text-xs text-zinc-400">创建：{formatDate(item.created_at)}</span>
                    </div>
                    <h2 className="mt-2 line-clamp-2 break-words text-base font-bold text-zinc-900">{item.title}</h2>
                    <p className="mt-1 line-clamp-3 break-words text-sm leading-relaxed text-zinc-600">{item.body}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void deleteNotification(item)}
                    disabled={deletingId === item.id}
                    className="shrink-0 rounded-lg border border-red-100 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-100 disabled:opacity-50"
                  >
                    {deletingId === item.id ? '删除中...' : '删除'}
                  </button>
                </div>

                <div className="mt-3 grid gap-2 text-sm text-zinc-500 md:grid-cols-2">
                  <p className="break-words">
                    用户：<span className="text-zinc-800">{userLabel(item)}</span>
                  </p>
                  <p className="break-words">用户 ID：{item.user_id}</p>
                  <p>已读时间：{formatDate(item.read_at)}</p>
                  <p>过期时间：{formatDate(item.expires_at)}</p>
                  {item.link_url ? (
                    <p className="break-words md:col-span-2">
                      链接：
                      <Link href={item.link_url} target="_blank" className="text-blue-600 hover:underline">
                        {item.link_url}
                      </Link>
                    </p>
                  ) : (
                    <p className="md:col-span-2">链接：—</p>
                  )}
                  {item.user?.email || item.user?.username ? (
                    <p className="break-words md:col-span-2">
                      用户信息：{item.user.username || '—'} / {item.user.email || '—'}
                    </p>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-6 flex flex-col items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white p-4 sm:flex-row">
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page <= 1 || loading}
            className="w-full rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 sm:w-auto"
          >
            上一页
          </button>
          <div className="text-sm text-zinc-500">
            共 {total} 条，第 {page} / {totalPages} 页
          </div>
          <button
            type="button"
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            disabled={page >= totalPages || loading}
            className="w-full rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 sm:w-auto"
          >
            下一页
          </button>
        </div>
      </div>
      <BackToTopButton />
    </>
  )
}
