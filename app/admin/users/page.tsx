'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import AdminPageHeader from '@/components/AdminPageHeader'
import BackToTopButton from '@/components/BackToTopButton'
import { clearAdminToken, getAdminToken, setAdminToken } from '@/lib/adminToken'
import type { NotificationType } from '@/types'

type UserStatus = 'active' | 'restricted' | 'banned'
type StatusFilter = 'all' | UserStatus

type AdminUser = {
  id: string
  email: string | null
  username: string | null
  phone: string | null
  bio: string | null
  status: UserStatus
  is_posting_exempt: boolean
  admin_note: string | null
  banned_reason: string | null
  banned_at: string | null
  banned_by: string | null
  created_at: string | null
  updated_at: string | null
  auth_providers: string[]
  auth_provider_label: string
  duplicate_email_group_count?: number
  has_duplicate_email?: boolean
  postCounts: {
    jobs: number
    housing: number
    secondhand: number
    services: number
    total: number
  }
}

type UsersResponse = {
  users: AdminUser[]
  total: number
  activeCount: number
  restrictedCount: number
  bannedCount: number
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasPrev: boolean
    hasNext: boolean
  }
  warnings?: string[]
  error?: string
}

type CardDraft = {
  admin_note: string
  banned_reason: string
}

type NotificationDraft = {
  type: NotificationType
  title: string
  body: string
  link_url: string
}

const LIMIT = 20

const DEFAULT_NOTIFICATION_DRAFT: NotificationDraft = {
  type: 'system',
  title: '',
  body: '',
  link_url: '',
}

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'active', label: '正常' },
  { value: 'restricted', label: '限制' },
  { value: 'banned', label: '禁用' },
]

const NOTIFICATION_TYPE_OPTIONS: { value: NotificationType; label: string }[] = [
  { value: 'system', label: '系统' },
  { value: 'announcement', label: '公告' },
  { value: 'account', label: '账号' },
  { value: 'content', label: '内容' },
  { value: 'favorite', label: '收藏' },
  { value: 'dmv', label: 'DMV' },
]

const compactLineClampStyle = {
  display: '-webkit-box',
  WebkitBoxOrient: 'vertical' as const,
  WebkitLineClamp: 2,
  overflow: 'hidden',
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

function statusLabel(status: UserStatus): string {
  if (status === 'banned') return '禁用'
  if (status === 'restricted') return '限制'
  return '正常'
}

function statusClassName(status: UserStatus): string {
  if (status === 'banned') return 'bg-red-50 text-red-600 ring-red-100'
  if (status === 'restricted') return 'bg-amber-50 text-amber-700 ring-amber-100'
  return 'bg-emerald-50 text-emerald-700 ring-emerald-100'
}

function compactText(value: string | null): string {
  const trimmed = value?.trim()
  return trimmed ? trimmed : '—'
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm">
      <div className="text-xs font-medium text-zinc-500">{label}</div>
      <div className="mt-2 text-2xl font-bold text-zinc-900">{value}</div>
    </div>
  )
}

export default function AdminUsersPage() {
  const [token, setToken] = useState('')
  const [inputToken, setInputToken] = useState('')
  const [showTokenEditor, setShowTokenEditor] = useState(false)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [total, setTotal] = useState(0)
  const [activeCount, setActiveCount] = useState(0)
  const [restrictedCount, setRestrictedCount] = useState(0)
  const [bannedCount, setBannedCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [pageMessage, setPageMessage] = useState('')
  const [warnings, setWarnings] = useState<string[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [notifyingId, setNotifyingId] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, CardDraft>>({})
  const [notificationDrafts, setNotificationDrafts] = useState<Record<string, NotificationDraft>>({})
  const [savingId, setSavingId] = useState<string | null>(null)
  const [sendingNotificationId, setSendingNotificationId] = useState<string | null>(null)
  const [cardMessages, setCardMessages] = useState<Record<string, { type: 'success' | 'error'; text: string }>>({})

  const fetchUsers = useCallback(
    async (nextToken = token) => {
      if (!nextToken) return
      setLoading(true)
      setPageMessage('')
      setWarnings([])

      const params = new URLSearchParams({
        search,
        status: statusFilter,
        page: String(page),
        limit: String(LIMIT),
      })

      try {
        const res = await fetch(`/api/admin/users?${params.toString()}`, {
          headers: { 'x-admin-token': nextToken },
          cache: 'no-store',
        })
        const json = (await res.json()) as UsersResponse

        if (!res.ok) {
          setPageMessage(json.error || '获取用户列表失败')
          if (res.status === 401) setShowTokenEditor(true)
          return
        }

        setUsers(Array.isArray(json.users) ? json.users : [])
        setTotal(json.total ?? 0)
        setActiveCount(json.activeCount ?? 0)
        setRestrictedCount(json.restrictedCount ?? 0)
        setBannedCount(json.bannedCount ?? 0)
        setTotalPages(json.pagination?.totalPages ?? 1)
        setWarnings(json.warnings ?? [])

        const nextDrafts: Record<string, CardDraft> = {}
        for (const user of json.users ?? []) {
          nextDrafts[user.id] = {
            admin_note: user.admin_note ?? '',
            banned_reason: user.banned_reason ?? '',
          }
        }
        setDrafts((current) => ({ ...nextDrafts, ...Object.fromEntries(Object.entries(current).filter(([id]) => nextDrafts[id])) }))
      } catch {
        setPageMessage('网络错误，请稍后重试')
      } finally {
        setLoading(false)
      }
    },
    [page, search, statusFilter, token]
  )

  useEffect(() => {
    const stored = getAdminToken()
    if (stored) {
      setToken(stored)
      setInputToken(stored)
    }
  }, [])

  useEffect(() => {
    if (token) void fetchUsers(token)
  }, [fetchUsers, token])

  function saveToken() {
    const nextToken = inputToken.trim()
    if (!nextToken) {
      setPageMessage('请输入 Admin Token')
      return
    }
    setAdminToken(nextToken)
    setToken(nextToken)
    setInputToken(nextToken)
    setShowTokenEditor(false)
    setPage(1)
    setPageMessage('')
  }

  function logoutAdmin() {
    clearAdminToken()
    setToken('')
    setInputToken('')
    setShowTokenEditor(false)
    setUsers([])
    setPageMessage('')
    setCardMessages({})
  }

  function setCardMessage(userId: string, type: 'success' | 'error', text: string) {
    setCardMessages((current) => ({ ...current, [userId]: { type, text } }))
    window.setTimeout(() => {
      setCardMessages((current) => {
        const next = { ...current }
        delete next[userId]
        return next
      })
    }, 5000)
  }

  function updateDraft(userId: string, patch: Partial<CardDraft>) {
    setDrafts((current) => ({
      ...current,
      [userId]: {
        admin_note: current[userId]?.admin_note ?? '',
        banned_reason: current[userId]?.banned_reason ?? '',
        ...patch,
      },
    }))
  }

  function getNotificationDraft(userId: string): NotificationDraft {
    return notificationDrafts[userId] ?? DEFAULT_NOTIFICATION_DRAFT
  }

  function updateNotificationDraft(userId: string, patch: Partial<NotificationDraft>) {
    setNotificationDrafts((current) => ({
      ...current,
      [userId]: {
        ...(current[userId] ?? DEFAULT_NOTIFICATION_DRAFT),
        ...patch,
      },
    }))
  }

  function resetNotificationDraft(userId: string) {
    setNotificationDrafts((current) => ({
      ...current,
      [userId]: DEFAULT_NOTIFICATION_DRAFT,
    }))
  }

  async function patchUser(user: AdminUser, payload: Record<string, unknown>, successMessage: string) {
    setSavingId(user.id)
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': token,
        },
        body: JSON.stringify(payload),
      })
      const json = (await res.json()) as { data?: Partial<AdminUser>; error?: string }

      if (!res.ok) {
        setCardMessage(user.id, 'error', json.error || '操作失败')
        return
      }

      const updatedUser = json.data
      if (!updatedUser) {
        setCardMessage(user.id, 'error', json.error || '操作失败')
        return
      }

      setUsers((current) =>
        current.map((item) =>
          item.id === user.id
            ? {
                ...item,
                ...updatedUser,
                status: updatedUser.status ?? item.status,
                postCounts: item.postCounts,
              }
            : item
        )
      )
      setCardMessage(user.id, 'success', successMessage)
      await fetchUsers(token)
    } catch {
      setCardMessage(user.id, 'error', '网络错误，请稍后重试')
    } finally {
      setSavingId(null)
    }
  }

  async function saveNote(user: AdminUser) {
    const draft = drafts[user.id] ?? { admin_note: '', banned_reason: '' }
    await patchUser(
      user,
      {
        admin_note: draft.admin_note,
        banned_reason: draft.banned_reason,
      },
      '备注已保存'
    )
  }

  async function banUser(user: AdminUser) {
    const draft = drafts[user.id] ?? { admin_note: '', banned_reason: '' }
    await patchUser(
      user,
      {
        status: 'banned',
        banned_reason: draft.banned_reason,
      },
      '用户已禁用'
    )
  }

  async function restoreUser(user: AdminUser) {
    await patchUser(user, { status: 'active' }, '用户已恢复')
  }

  async function enablePostingExempt(user: AdminUser) {
    await patchUser(user, { is_posting_exempt: true }, '已开启免发布限制')
  }

  async function disablePostingExempt(user: AdminUser) {
    await patchUser(user, { is_posting_exempt: false }, '已关闭免发布限制')
  }

  async function sendNotification(user: AdminUser) {
    const draft = getNotificationDraft(user.id)
    const title = draft.title.trim()
    const body = draft.body.trim()
    const linkUrl = draft.link_url.trim()

    if (!title) {
      setCardMessage(user.id, 'error', '请输入通知标题')
      return
    }
    if (!body) {
      setCardMessage(user.id, 'error', '请输入通知内容')
      return
    }

    setSendingNotificationId(user.id)
    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': token,
        },
        body: JSON.stringify({
          user_id: user.id,
          type: draft.type,
          title,
          body,
          link_url: linkUrl || null,
        }),
      })
      const json = (await res.json().catch(() => null)) as { error?: string } | null

      if (!res.ok) {
        setCardMessage(user.id, 'error', json?.error || '发送通知失败')
        return
      }

      resetNotificationDraft(user.id)
      setNotifyingId(null)
      setCardMessage(user.id, 'success', '通知已发送')
    } catch {
      setCardMessage(user.id, 'error', '网络错误，请稍后重试')
    } finally {
      setSendingNotificationId(null)
    }
  }

  if (!token) {
    return (
      <>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <AdminPageHeader title="用户管理" description="管理注册用户状态、禁用账号和后台备注。" />
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 md:p-6">
            <h2 className="text-lg font-semibold text-zinc-900">OpenAA 管理后台</h2>
            <p className="mt-1 text-sm text-zinc-600">请输入 Admin Token 进入用户管理。</p>
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
            {pageMessage ? <p className="mt-2 text-sm text-red-500">{pageMessage}</p> : null}
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
          title="用户管理"
          description="管理注册用户状态、禁用账号和后台备注。"
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

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="总用户" value={total} />
          <StatCard label="正常" value={activeCount} />
          <StatCard label="限制" value={restrictedCount} />
          <StatCard label="禁用" value={bannedCount} />
        </div>

        <div className="mt-5 rounded-2xl border border-zinc-200 bg-white p-4">
          <div className="flex flex-col gap-3 md:flex-row">
            <input
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
              placeholder="搜索邮箱 / 昵称 / 电话"
              className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 md:flex-1"
            />
            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as StatusFilter)
                setPage(1)
              }}
              className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 md:w-48"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {pageMessage ? <p className="mt-4 text-sm text-red-500">{pageMessage}</p> : null}
        {warnings.length > 0 ? (
          <p className="mt-4 text-sm text-amber-600">部分统计加载失败：{warnings.join('；')}</p>
        ) : null}
        {loading ? <p className="mt-4 text-sm text-zinc-500">加载中...</p> : null}

        <div className="mt-5 space-y-4">
          {!loading && users.length === 0 ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-center text-sm text-zinc-400">
              暂无符合条件的用户
            </div>
          ) : null}

          {users.map((user) => {
            const isEditing = editingId === user.id
            const isNotifying = notifyingId === user.id
            const draft = drafts[user.id] ?? { admin_note: user.admin_note ?? '', banned_reason: user.banned_reason ?? '' }
            const notificationDraft = getNotificationDraft(user.id)
            const cardMessage = cardMessages[user.id]
            const saving = savingId === user.id
            const sendingNotification = sendingNotificationId === user.id
            const isUserBanned = user.status === 'banned'
            const userStatusActionLabel = isUserBanned ? '恢复' : '禁用'
            const onUserStatusAction = () => (isUserBanned ? restoreUser(user) : banUser(user))
            const userStatusActionClassName = isUserBanned
              ? 'rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50'
              : 'rounded-lg border border-red-100 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-100 disabled:opacity-50'
            const userStatusActionEditorClassName = isUserBanned
              ? 'rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50'
              : 'rounded-lg border border-red-100 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100 disabled:opacity-50'
            const postingExemptActionLabel = user.is_posting_exempt ? '关闭免发布限制' : '开启免发布限制'
            const onPostingExemptAction = () =>
              user.is_posting_exempt ? disablePostingExempt(user) : enablePostingExempt(user)
            const postingExemptActionClassName = user.is_posting_exempt
              ? 'rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50'
              : 'rounded-lg border border-sky-100 bg-sky-50 px-3 py-1.5 text-sm font-medium text-sky-700 hover:bg-sky-100 disabled:opacity-50'

            return (
              <div key={user.id} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="break-words text-base font-bold text-zinc-900">
                        {user.username || '未设置昵称'}
                      </h2>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${statusClassName(user.status)}`}>
                        {statusLabel(user.status)}
                      </span>
                    </div>
                    <div className="mt-2 space-y-1 text-sm text-zinc-500">
                      <p className="break-words">邮箱：{user.email || '—'}</p>
                      <p className="break-words">登录方式：{user.auth_provider_label || '未知'}</p>
                      {user.has_duplicate_email ? (
                        <p className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-100">
                          同邮箱存在多个账号，请人工确认
                        </p>
                      ) : null}
                      <p className="break-words">电话：{user.phone || '—'}</p>
                      <p>注册时间：{formatDate(user.created_at)}</p>
                      <p>更新时间：{formatDate(user.updated_at)}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-600">
                  <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700 ring-1 ring-blue-100">招聘 {user.postCounts.jobs}</span>
                  <span className="rounded-full bg-purple-50 px-2.5 py-1 text-purple-700 ring-1 ring-purple-100">房屋 {user.postCounts.housing}</span>
                  <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700 ring-1 ring-amber-100">二手 {user.postCounts.secondhand}</span>
                  <span className="rounded-full bg-sky-50 px-2.5 py-1 text-sky-700 ring-1 ring-sky-100">服务 {user.postCounts.services}</span>
                  <span className="rounded-full bg-zinc-50 px-2.5 py-1 text-zinc-700 ring-1 ring-zinc-100">总计 {user.postCounts.total}</span>
                </div>

                <div className="mt-3 grid gap-1.5 text-sm md:grid-cols-2">
                  <div className="flex min-w-0 gap-1 text-zinc-600">
                    <span className="shrink-0 font-medium text-zinc-500">备注：</span>
                    <span className="min-w-0 flex-1 break-words text-zinc-700" style={compactLineClampStyle}>
                      {compactText(user.admin_note)}
                    </span>
                  </div>
                  <div className="flex min-w-0 gap-1 text-zinc-600">
                    <span className="shrink-0 font-medium text-zinc-500">原因：</span>
                    <span className="min-w-0 flex-1 break-words text-red-700" style={compactLineClampStyle}>
                      {compactText(user.banned_reason)}
                    </span>
                  </div>
                </div>
                <p className="mt-2 text-sm text-zinc-600">
                  免发布限制：{user.is_posting_exempt ? '已开启' : '未开启'}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href={`/admin/posts?user_id=${encodeURIComponent(user.id)}`}
                    className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                  >
                    查看帖子
                  </Link>
                  <button
                    type="button"
                    onClick={() => void onUserStatusAction()}
                    disabled={saving}
                    className={userStatusActionClassName}
                  >
                    {userStatusActionLabel}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId((current) => (current === user.id ? null : user.id))}
                    className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100"
                  >
                    编辑备注
                  </button>
                  <button
                    type="button"
                    onClick={() => setNotifyingId((current) => (current === user.id ? null : user.id))}
                    className="rounded-lg border border-violet-100 bg-violet-50 px-3 py-1.5 text-sm font-medium text-violet-700 hover:bg-violet-100"
                  >
                    发送通知
                  </button>
                  <button
                    type="button"
                    onClick={() => void onPostingExemptAction()}
                    disabled={saving}
                    className={postingExemptActionClassName}
                  >
                    {postingExemptActionLabel}
                  </button>
                </div>

                {cardMessage ? (
                  <p className={`mt-2 text-sm ${cardMessage.type === 'success' ? 'text-emerald-600' : 'text-red-500'}`}>
                    {cardMessage.text}
                  </p>
                ) : null}

                {isNotifying ? (
                  <div className="mt-4 rounded-2xl border border-violet-100 bg-violet-50/50 p-4">
                    <div className="mb-3 text-sm text-zinc-600">
                      发送给：
                      <span className="font-medium text-zinc-900">
                        {user.username || user.email || user.id}
                      </span>
                      {user.username && user.email ? <span className="text-zinc-400"> / {user.email}</span> : null}
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="block">
                        <span className="text-sm font-medium text-zinc-700">类型</span>
                        <select
                          value={notificationDraft.type}
                          onChange={(event) =>
                            updateNotificationDraft(user.id, { type: event.target.value as NotificationType })
                          }
                          className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                        >
                          {NOTIFICATION_TYPE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block">
                        <span className="text-sm font-medium text-zinc-700">链接（可选）</span>
                        <input
                          type="url"
                          value={notificationDraft.link_url}
                          onChange={(event) => updateNotificationDraft(user.id, { link_url: event.target.value })}
                          placeholder="/profile 或 https://..."
                          className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                        />
                      </label>
                    </div>
                    <label className="mt-3 block">
                      <span className="text-sm font-medium text-zinc-700">标题</span>
                      <input
                        type="text"
                        value={notificationDraft.title}
                        onChange={(event) => updateNotificationDraft(user.id, { title: event.target.value })}
                        maxLength={200}
                        className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      />
                    </label>
                    <label className="mt-3 block">
                      <span className="text-sm font-medium text-zinc-700">内容</span>
                      <textarea
                        value={notificationDraft.body}
                        onChange={(event) => updateNotificationDraft(user.id, { body: event.target.value })}
                        maxLength={1000}
                        rows={4}
                        className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      />
                    </label>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void sendNotification(user)}
                        disabled={sendingNotification}
                        className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
                      >
                        {sendingNotification ? '发送中...' : '发送通知'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setNotifyingId(null)}
                        disabled={sendingNotification}
                        className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                ) : null}

                {isEditing ? (
                  <div className="mt-4 rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="block">
                        <span className="text-sm font-medium text-zinc-700">后台备注</span>
                        <textarea
                          value={draft.admin_note}
                          onChange={(event) => updateDraft(user.id, { admin_note: event.target.value })}
                          rows={4}
                          className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                        />
                      </label>
                      <label className="block">
                        <span className="text-sm font-medium text-zinc-700">禁用原因</span>
                        <textarea
                          value={draft.banned_reason}
                          onChange={(event) => updateDraft(user.id, { banned_reason: event.target.value })}
                          rows={4}
                          className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                        />
                      </label>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void saveNote(user)}
                        disabled={saving}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        {saving ? '保存中...' : '保存备注'}
                      </button>
                      <button
                        type="button"
                        onClick={() => void onUserStatusAction()}
                        disabled={saving}
                        className={userStatusActionEditorClassName}
                      >
                        {isUserBanned ? '恢复用户' : '禁用用户'}
                      </button>
                    </div>
                  </div>
                ) : null}
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
            第 {page} / {totalPages} 页
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
