'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { LOCATION_OPTIONS } from '@/lib/locationOptions'
import { formatSalary } from '@/lib/utils'
import type { UnifiedPost } from '@/types'
import { clearAdminToken, getAdminToken, setAdminToken } from '@/lib/adminToken'
import BackToTopButton from '@/components/BackToTopButton'
import FilterDropdown from '@/components/FilterDropdown'

const MODULE_FILTERS = [
  { key: 'all', label: '全部模块' },
  { key: 'jobs', label: '招聘' },
  { key: 'housing', label: '房屋' },
  { key: 'secondhand', label: '二手' },
  { key: 'services', label: '本地服务' },
] as const

const STATUS_FILTERS = [
  { key: 'all', label: '全部状态' },
  { key: 'published', label: '显示中' },
  { key: 'hidden', label: '已隐藏' },
  { key: 'deleted', label: '已删除' },
] as const

const LOCATION_FILTER_OPTIONS = ['全部地区', ...LOCATION_OPTIONS] as const

type ModuleFilter = 'all' | 'jobs' | 'housing' | 'secondhand' | 'services'
type AdminPostModule = Exclude<ModuleFilter, 'all'>
type AdminUnifiedPost = Omit<UnifiedPost, 'module'> & { module: AdminPostModule }
type StatusFilter = 'all' | 'published' | 'hidden' | 'deleted'
type OpenFilterKey = 'module' | 'location' | 'status' | null
type PinFormState = {
  is_pinned: boolean
  pinned_order: number
  pinned_until: string
}
type NotificationDraft = {
  title: string
  body: string
  link_url: string
}

function formatDate(s: string | null | undefined) {
  if (!s) return ''
  try {
    return new Date(s).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  } catch {
    return s
  }
}

function moduleBadge(module: string) {
  if (module === 'jobs') {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 ring-1 ring-blue-100">
        招聘
      </span>
    )
  }
  if (module === 'housing') {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 ring-1 ring-purple-100">
        房屋
      </span>
    )
  }
  if (module === 'services') {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 ring-1 ring-teal-100">
        本地服务
      </span>
    )
  }
  return (
    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-100">
      二手
    </span>
  )
}

function statusBadge(status: string) {
  if (status === 'deleted') {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600 ring-1 ring-red-100">
        已删除
      </span>
    )
  }
  if (status === 'hidden' || status === 'unpublished') {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-50 text-zinc-500 ring-1 ring-zinc-100">
        已隐藏
      </span>
    )
  }
  return (
    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
      显示中
    </span>
  )
}

function moduleDetailHref(post: AdminUnifiedPost): string {
  if (post.module === 'jobs') return `/jobs/${post.id}?from_admin=1&return_to=/admin/posts`
  if (post.module === 'housing') return `/housing/${post.id}?from_admin=1&return_to=/admin/posts`
  if (post.module === 'services') return `/services/${post.id}?from_admin=1&return_to=/admin/posts`
  return `/secondhand/${post.id}?from_admin=1&return_to=/admin/posts`
}

function publicModuleDetailHref(post: AdminUnifiedPost): string {
  if (post.module === 'jobs') return `/jobs/${post.id}`
  if (post.module === 'housing') return `/housing/${post.id}`
  if (post.module === 'services') return `/services/${post.id}`
  return `/secondhand/${post.id}`
}

function postKey(post: AdminUnifiedPost): string {
  return `${post.module}-${post.id}`
}

function typeLabel(post: AdminUnifiedPost): string | null {
  if (post.module === 'jobs') {
    return post.type === 'seeking' ? '求职' : '招聘'
  }
  if (post.module === 'housing') {
    return post.type === 'seeking' ? '求租' : '出租'
  }
  if (post.module === 'secondhand') {
    return post.type === 'buying' ? '求购' : '出售'
  }
  if (post.module === 'services') {
    return post.type || null
  }
  return null
}

function formatPrice(post: AdminUnifiedPost): string | null {
  if (post.module === 'jobs') {
    return formatSalary(post.salary_min, post.salary_max, post.salary_unit)
  }
  if (post.module === 'services') {
    return null
  }
  const v = post.price_value
  if (v == null || v <= 0) return null
  return `$${v}`
}

/** Check whether a post is effectively hidden (status-wise) */
function isHidden(status: string) {
  return status === 'hidden' || status === 'unpublished'
}

function isActive(status: string) {
  return status === 'published'
}

function isDeleted(status: string) {
  return status === 'deleted'
}

function toSortableTime(value: string | null | undefined): number {
  if (!value) return 0
  const time = new Date(value).getTime()
  return Number.isNaN(time) ? 0 : time
}

function isEffectivePinned(post: AdminUnifiedPost, nowTime: number): boolean {
  if (!post.is_pinned) return false
  if (post.status !== 'published') return false
  if (!post.pinned_until) return true
  return toSortableTime(post.pinned_until) > nowTime
}

function formatPinnedUntil(value: string | null | undefined): string {
  if (!value) return '长期置顶'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  const pad = (num: number) => String(num).padStart(2, '0')
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function toDatetimeLocalValue(value: string | null | undefined): string {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const offset = d.getTimezoneOffset()
  const local = new Date(d.getTime() - offset * 60_000)
  return local.toISOString().slice(0, 16)
}

function AdminPostsContent() {
  const searchParams = useSearchParams()
  const userIdFilter = searchParams.get('user_id')?.trim() || ''
  const formRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [token, setToken] = useState('')
  const [inputToken, setInputToken] = useState('')
  const [isUsingUnifiedToken, setIsUsingUnifiedToken] = useState(false)
  const [showTokenEditor, setShowTokenEditor] = useState(false)
  const [posts, setPosts] = useState<AdminUnifiedPost[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [listSuccessMessage, setListSuccessMessage] = useState('')
  const [search, setSearch] = useState('')
  const [moduleFilter, setModuleFilter] = useState<ModuleFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [locationFilter, setLocationFilter] = useState('全部地区')
  const [openFilterKey, setOpenFilterKey] = useState<OpenFilterKey>(null)
  const [pinEditingPost, setPinEditingPost] = useState<AdminUnifiedPost | null>(null)
  const [notifyingPostKey, setNotifyingPostKey] = useState<string | null>(null)
  const [notificationDrafts, setNotificationDrafts] = useState<Record<string, NotificationDraft>>({})
  const [sendingNotificationKey, setSendingNotificationKey] = useState<string | null>(null)
  const [pinForm, setPinForm] = useState<PinFormState>({
    is_pinned: false,
    pinned_order: 0,
    pinned_until: '',
  })

  const fetchPosts = useCallback(async (t: string) => {
    setLoading(true)
    setMessage('')
    try {
      const params = new URLSearchParams()
      if (userIdFilter) params.set('user_id', userIdFilter)
      const url = params.toString() ? `/api/admin/posts?${params.toString()}` : '/api/admin/posts'
      const res = await fetch(url, {
        headers: { 'x-admin-token': t },
      })
      const json: unknown = await res.json()
      if (
        json !== null &&
        typeof json === 'object' &&
        'data' in json &&
        Array.isArray((json as Record<string, unknown>).data)
      ) {
        setPosts((json as { data: AdminUnifiedPost[] }).data)
        const warnings = (json as { warnings?: string[] }).warnings
        if (warnings && warnings.length > 0) {
          setMessage(`部分模块加载失败：${warnings.join('；')}`)
        }
      } else if (json !== null && typeof json === 'object' && 'error' in json) {
        setMessage((json as { error: string }).error || '获取失败')
      }
    } catch {
      setMessage('网络错误')
    }
    setLoading(false)
  }, [userIdFilter])

  useEffect(() => {
    const stored = getAdminToken()
    if (stored) {
      setToken(stored)
      setInputToken(stored)
      setIsUsingUnifiedToken(true)
      fetchPosts(stored)
    }
  }, [fetchPosts])

  function saveToken() {
    const nextToken = inputToken.trim()
    if (!nextToken) {
      setMessage('请输入 Admin Token')
      return
    }
    setAdminToken(nextToken)
    setToken(nextToken)
    setInputToken(nextToken)
    setIsUsingUnifiedToken(true)
    setShowTokenEditor(false)
    setMessage('')
    fetchPosts(nextToken)
  }

  function logoutAdmin() {
    clearAdminToken()
    setToken('')
    setInputToken('')
    setIsUsingUnifiedToken(false)
    setShowTokenEditor(false)
    setPosts([])
    setMessage('')
    setListSuccessMessage('')
    setPinEditingPost(null)
    setNotifyingPostKey(null)
    setNotificationDrafts({})
    setSendingNotificationKey(null)
  }

  function scrollToForm() {
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  function startPinSettings(post: AdminUnifiedPost) {
    setPinEditingPost(post)
    setPinForm({
      is_pinned: post.is_pinned === true,
      pinned_order:
        typeof post.pinned_order === 'number' && Number.isInteger(post.pinned_order) && post.pinned_order >= 0
          ? post.pinned_order
          : 0,
      pinned_until: toDatetimeLocalValue(post.pinned_until),
    })
    setMessage('')
    setListSuccessMessage('')
    scrollToForm()
  }

  function getNotificationDraft(post: AdminUnifiedPost): NotificationDraft {
    return notificationDrafts[postKey(post)] ?? {
      title: '',
      body: '',
      link_url: publicModuleDetailHref(post),
    }
  }

  function updateNotificationDraft(post: AdminUnifiedPost, patch: Partial<NotificationDraft>) {
    const key = postKey(post)
    setNotificationDrafts((current) => ({
      ...current,
      [key]: {
        ...(current[key] ?? {
          title: '',
          body: '',
          link_url: publicModuleDetailHref(post),
        }),
        ...patch,
      },
    }))
  }

  function toggleNotificationForm(post: AdminUnifiedPost) {
    const key = postKey(post)
    setNotifyingPostKey((current) => (current === key ? null : key))
    setNotificationDrafts((current) => ({
      ...current,
      [key]: current[key] ?? {
        title: '',
        body: '',
        link_url: publicModuleDetailHref(post),
      },
    }))
    setMessage('')
    setListSuccessMessage('')
  }

  async function updatePost(post: AdminUnifiedPost, payload: Record<string, unknown>) {
    try {
      const res = await fetch(`/api/admin/posts/${post.id}`, {
        method: 'PATCH',
        headers: { 'x-admin-token': token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ module: post.module, ...payload }),
      })
      const json: unknown = await res.json()
      if (
        json !== null &&
        typeof json === 'object' &&
        'data' in json &&
        (json as { data?: Record<string, unknown> }).data
      ) {
        const updated = (json as { data: Record<string, unknown> }).data
        setPosts((prev) =>
          prev.map((p) =>
            p.id === post.id && p.module === post.module
              ? {
                  ...p,
                  ...updated,
                  id: p.id,
                  module: p.module,
                }
              : p
          )
        )
        return true
      }
      setMessage(
        json !== null && typeof json === 'object' && 'error' in json
          ? String((json as { error?: string }).error || '操作失败')
          : '操作失败'
      )
      return false
    } catch {
      setMessage('网络错误')
      return false
    }
  }

  async function handleHide(post: AdminUnifiedPost) {
    const ok = await updatePost(post, { status: 'hidden' })
    if (ok) {
      setListSuccessMessage('已隐藏')
      setTimeout(() => setListSuccessMessage(''), 4000)
    }
  }

  async function handleRestore(post: AdminUnifiedPost) {
    const ok = await updatePost(post, { status: 'published' })
    if (ok) {
      setListSuccessMessage('已恢复显示')
      setTimeout(() => setListSuccessMessage(''), 4000)
    }
  }

  async function handleDelete(post: AdminUnifiedPost) {
    const moduleName =
      post.module === 'jobs'
        ? '招聘'
        : post.module === 'housing'
          ? '房屋'
          : post.module === 'services'
            ? '本地服务'
            : '二手'
    if (!confirm(`确认删除此${moduleName}帖子？`)) {
      return
    }
    const ok = await updatePost(post, { status: 'deleted' })
    if (ok) {
      setListSuccessMessage('已标记为删除')
      setTimeout(() => setListSuccessMessage(''), 4000)
    }
  }

  async function sendAuthorNotification(post: AdminUnifiedPost) {
    const key = postKey(post)
    const userId = post.user_id?.trim()
    if (!userId) {
      setMessage('该帖子缺少发布者 ID，无法发送通知')
      return
    }

    const draft = getNotificationDraft(post)
    const title = draft.title.trim()
    const body = draft.body.trim()
    const linkUrl = draft.link_url.trim()

    if (!title) {
      setMessage('请输入通知标题')
      return
    }
    if (!body) {
      setMessage('请输入通知内容')
      return
    }

    setSendingNotificationKey(key)
    setMessage('')
    setListSuccessMessage('')
    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': token,
        },
        body: JSON.stringify({
          user_id: userId,
          type: 'content',
          title,
          body,
          link_url: linkUrl || null,
        }),
      })
      const json = (await res.json().catch(() => null)) as { error?: string } | null
      if (!res.ok) {
        setMessage(json?.error || '发送通知失败')
        return
      }

      setNotifyingPostKey(null)
      setNotificationDrafts((current) => ({
        ...current,
        [key]: {
          title: '',
          body: '',
          link_url: publicModuleDetailHref(post),
        },
      }))
      setListSuccessMessage('通知已发送')
      setTimeout(() => setListSuccessMessage(''), 4000)
    } catch {
      setMessage('网络错误，请稍后重试')
    } finally {
      setSendingNotificationKey(null)
    }
  }

  async function submitPinSettings(e: React.FormEvent) {
    e.preventDefault()
    if (!pinEditingPost) return
    if (!Number.isInteger(pinForm.pinned_order) || pinForm.pinned_order < 0) {
      setMessage('置顶排序必须是大于等于 0 的整数')
      return
    }

    const ok = await updatePost(pinEditingPost, {
      is_pinned: pinForm.is_pinned,
      pinned_order: pinForm.pinned_order,
      pinned_until: pinForm.pinned_until.trim() || null,
    })
    if (ok) {
      setPinEditingPost(null)
      setListSuccessMessage('置顶设置保存成功')
      setTimeout(() => setListSuccessMessage(''), 5000)
      requestAnimationFrame(() => {
        listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    }
  }

  const filtered = useMemo(() => {
    const nowTime = Date.now()
    const locationKeyword = locationFilter === '全部地区' ? '' : locationFilter.split(' ')[0]
    return posts
      .filter((p) => {
        const matchModule = moduleFilter === 'all' || p.module === moduleFilter
        const matchStatus =
          statusFilter === 'all' ||
          (statusFilter === 'published' && isActive(p.status)) ||
          (statusFilter === 'hidden' && isHidden(p.status)) ||
          (statusFilter === 'deleted' && isDeleted(p.status))
        const matchLocation =
          !locationKeyword ||
          (p.location || '').includes(locationKeyword)
        const q = search.trim().toLowerCase()
        const matchSearch =
          !q ||
          (p.title || '').toLowerCase().includes(q) ||
          (p.description || '').toLowerCase().includes(q) ||
          (p.location || '').toLowerCase().includes(q) ||
          (p.type || '').toLowerCase().includes(q) ||
          (p.contact_name || '').toLowerCase().includes(q) ||
          (p.phone || '').toLowerCase().includes(q) ||
          (p.wechat || '').toLowerCase().includes(q)
        return matchModule && matchStatus && matchLocation && matchSearch
      })
      .sort((a, b) => {
        const aPinned = isEffectivePinned(a, nowTime)
        const bPinned = isEffectivePinned(b, nowTime)
        if (aPinned !== bPinned) return aPinned ? -1 : 1

        if (aPinned && bPinned) {
          const pinnedOrderDiff = (a.pinned_order ?? 0) - (b.pinned_order ?? 0)
          if (pinnedOrderDiff !== 0) return pinnedOrderDiff

          const createdAtDiff = toSortableTime(b.created_at) - toSortableTime(a.created_at)
          if (createdAtDiff !== 0) return createdAtDiff
        }

        return toSortableTime(b.created_at) - toSortableTime(a.created_at)
      })
  }, [posts, moduleFilter, statusFilter, locationFilter, search])

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Link
        href="/admin"
        className="mb-4 inline-flex items-center rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50"
      >
        ← 返回总后台
      </Link>
      <h1 className="text-2xl font-bold mb-6 mt-3">帖子管理</h1>

      {userIdFilter ? (
        <div className="mb-4 rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <p className="text-sm font-medium text-blue-700">当前正在查看指定用户发布的内容</p>
          <p className="mt-1 break-words text-xs text-blue-600">用户 ID：{userIdFilter}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/admin/users"
              className="rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-50"
            >
              返回用户管理
            </Link>
            <Link
              href="/admin/posts"
              className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              清除用户筛选
            </Link>
          </div>
        </div>
      ) : null}

      {/* Token input */}
      {!token ? (
        <div className="mb-6 p-4 bg-gray-50 rounded-xl border">
          <label className="block text-sm font-medium mb-1">Admin Token</label>
          <div className="flex gap-2">
            <input
              type="password"
              value={inputToken}
              onChange={(e) => setInputToken(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') saveToken() }}
              placeholder="输入管理 Token"
              className="flex-1 border rounded-lg px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={saveToken}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium"
            >
              确认
            </button>
          </div>
          {message ? <p className="mt-2 text-sm text-red-500">{message}</p> : null}
        </div>
      ) : (
        <div className="mb-6 rounded-xl border bg-gray-50 p-4 space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-700">
              {isUsingUnifiedToken ? '已使用统一后台登录 Token' : '已使用当前 Admin Token'}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowTokenEditor((prev) => !prev)}
                className="px-3 py-1.5 rounded-lg border text-sm text-gray-600 hover:bg-gray-50"
              >
                更换 Token
              </button>
              <button
                type="button"
                onClick={logoutAdmin}
                className="px-3 py-1.5 rounded-lg border text-sm text-gray-600 hover:bg-gray-50"
              >
                退出后台
              </button>
            </div>
          </div>
          {showTokenEditor ? (
            <div className="flex gap-2">
              <input
                type="password"
                value={inputToken}
                onChange={(e) => setInputToken(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') saveToken() }}
                placeholder="输入新的 Admin Token"
                className="flex-1 border rounded-lg px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={saveToken}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium"
              >
                保存 Token
              </button>
            </div>
          ) : null}
        </div>
      )}

      {message && (
        <p className={`mb-4 text-sm ${message.includes('成功') || message.includes('已') ? 'text-green-600' : 'text-red-500'}`}>
          {message}
        </p>
      )}

      {/* Filters */}
      {token ? (
        <div className="mb-4 space-y-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索标题 / 地区 / 联系人 / 电话 / 微信..."
            className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="sticky top-14 z-20 -mx-4 border-y border-zinc-100 bg-zinc-50/95 px-4 py-2 shadow-[0_6px_16px_rgba(15,23,42,0.08)] backdrop-blur-sm">
            <div className="flex flex-wrap gap-2">
              <FilterDropdown
                value={moduleFilter}
                options={MODULE_FILTERS.map((f) => ({
                  value: f.key,
                  label: f.label,
                }))}
                onChange={(next) => setModuleFilter(next as ModuleFilter)}
                placeholder="全部模块"
                className="w-[calc(50%-0.25rem)] min-w-0 sm:w-[190px]"
                isOpen={openFilterKey === 'module'}
                onOpenChange={(open) => setOpenFilterKey(open ? 'module' : null)}
              />
              <FilterDropdown
                value={locationFilter}
                options={LOCATION_FILTER_OPTIONS.map((loc) => ({
                  value: loc,
                  label: loc,
                }))}
                onChange={(next) => setLocationFilter(String(next))
                }
                placeholder="全部地区"
                className="w-[calc(50%-0.25rem)] min-w-0 sm:w-[190px]"
                isOpen={openFilterKey === 'location'}
                onOpenChange={(open) => setOpenFilterKey(open ? 'location' : null)}
              />
              <FilterDropdown
                value={statusFilter}
                options={STATUS_FILTERS.map((f) => ({
                  value: f.key,
                  label: f.label,
                }))}
                onChange={(next) => setStatusFilter(next as StatusFilter)}
                placeholder="全部状态"
                className="w-[calc(50%-0.25rem)] min-w-0 sm:w-[190px]"
                isOpen={openFilterKey === 'status'}
                onOpenChange={(open) => setOpenFilterKey(open ? 'status' : null)}
              />
            </div>
          </div>
        </div>
      ) : null}

      {loading && <p className="text-sm text-gray-500 mb-4">加载中...</p>}

      {pinEditingPost && (
        <div ref={formRef} className="mb-4 scroll-mt-24 rounded-xl border bg-white p-4 shadow-sm">
          <form onSubmit={submitPinSettings} className="space-y-3">
            <h2 className="text-base font-semibold">置顶设置</h2>
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={pinForm.is_pinned}
                onChange={(e) => setPinForm((prev) => ({ ...prev, is_pinned: e.target.checked }))}
              />
              设为置顶
            </label>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">置顶排序</label>
              <input
                type="number"
                min={0}
                step={1}
                value={pinForm.pinned_order}
                onChange={(e) =>
                  setPinForm((prev) => ({ ...prev, pinned_order: Number(e.target.value) }))
                }
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
              <p className="mt-1 text-xs text-gray-500">数字越小越靠前，0 为最高优先级；数字相同时，发布时间较新的排前。</p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">置顶到期时间（可选）</label>
              <input
                type="datetime-local"
                value={pinForm.pinned_until}
                onChange={(e) => setPinForm((prev) => ({ ...prev, pinned_until: e.target.value }))}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
              <p className="mt-1 text-xs text-gray-500">留空表示长期置顶。</p>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white"
              >
                保存置顶设置
              </button>
              <button
                type="button"
                onClick={() => setPinEditingPost(null)}
                className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-600"
              >
                取消
              </button>
            </div>
          </form>
        </div>
      )}

      {!loading && token && filtered.length === 0 && (
        <p className="text-sm text-gray-400 mb-4">暂无符合条件的帖子</p>
      )}

      {/* List */}
      <div ref={listRef} className="scroll-mt-6 space-y-3">
        {listSuccessMessage && (
          <p className="mb-2 text-sm text-green-600">{listSuccessMessage}</p>
        )}
        {filtered.map((post) => {
          const label = typeLabel(post)
          const price = formatPrice(post)
          const deleted = isDeleted(post.status)
          const active = isActive(post.status)
          const key = postKey(post)
          const notificationDraft = getNotificationDraft(post)
          const notificationFormOpen = notifyingPostKey === key
          const sendingNotification = sendingNotificationKey === key
          const canNotifyAuthor = Boolean(post.user_id?.trim())
          return (
            <div key={key} className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm">
              <p className="text-base font-bold leading-snug text-zinc-900 line-clamp-2 break-words">{post.title}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {moduleBadge(post.module)}
                {statusBadge(post.status)}
                {label ? (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-50 text-zinc-500 ring-1 ring-zinc-100">
                    {label}
                  </span>
                ) : null}
                {price ? (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 ring-1 ring-green-100">
                    {price}
                  </span>
                ) : null}
                {isEffectivePinned(post, Date.now()) ? (
                  <>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 ring-1 ring-blue-100">已置顶</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100">
                      排序 {post.pinned_order ?? 0}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 ring-1 ring-purple-100 break-words">
                      {post.pinned_until ? `到期：${formatPinnedUntil(post.pinned_until)}` : '长期置顶'}
                    </span>
                  </>
                ) : null}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-zinc-500">
                {post.location ? <span className="break-words">📍 {post.location}</span> : null}
                {post.contact_name ? <span className="break-words">👤 {post.contact_name}</span> : null}
                {post.phone ? <span className="break-words">📞 {post.phone}</span> : null}
                {post.wechat ? <span className="break-words">💬 {post.wechat}</span> : null}
                <span>🕒 {formatDate(post.created_at)}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href={moduleDetailHref(post)}
                  target="_blank"
                  className="text-xs px-3 py-1.5 rounded-lg border text-gray-700 hover:bg-gray-50 transition"
                >
                  查看
                </Link>
                {active ? (
                  <button
                    type="button"
                    onClick={() => startPinSettings(post)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition"
                  >
                    置顶设置
                  </button>
                ) : null}
                {canNotifyAuthor ? (
                  <button
                    type="button"
                    onClick={() => toggleNotificationForm(post)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-violet-200 text-violet-700 bg-violet-50 hover:bg-violet-100 transition"
                  >
                    通知发布者
                  </button>
                ) : null}
                {!active ? (
                  <button
                    type="button"
                    onClick={() => handleRestore(post)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 transition"
                  >
                    恢复
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleHide(post)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 transition"
                  >
                    下架
                  </button>
                )}
                {!deleted ? (
                  <button
                    type="button"
                    onClick={() => handleDelete(post)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 transition"
                  >
                    删除
                  </button>
                ) : null}
              </div>

              {notificationFormOpen ? (
                <div className="mt-4 rounded-xl border border-violet-100 bg-violet-50/50 p-4">
                  <p className="mb-3 text-sm text-zinc-600">
                    发送给发布者：
                    <span className="break-words font-medium text-zinc-900">{post.user_id}</span>
                  </p>
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="block">
                      <span className="text-sm font-medium text-zinc-700">类型</span>
                      <input
                        type="text"
                        value="内容"
                        disabled
                        className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-100 px-3 py-2 text-sm text-zinc-500"
                      />
                    </label>
                    <label className="block">
                      <span className="text-sm font-medium text-zinc-700">链接（可选）</span>
                      <input
                        type="text"
                        value={notificationDraft.link_url}
                        onChange={(event) => updateNotificationDraft(post, { link_url: event.target.value })}
                        className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      />
                    </label>
                  </div>
                  <label className="mt-3 block">
                    <span className="text-sm font-medium text-zinc-700">标题</span>
                    <input
                      type="text"
                      value={notificationDraft.title}
                      onChange={(event) => updateNotificationDraft(post, { title: event.target.value })}
                      maxLength={200}
                      className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                  </label>
                  <label className="mt-3 block">
                    <span className="text-sm font-medium text-zinc-700">内容</span>
                    <textarea
                      value={notificationDraft.body}
                      onChange={(event) => updateNotificationDraft(post, { body: event.target.value })}
                      maxLength={1000}
                      rows={4}
                      className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                  </label>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void sendAuthorNotification(post)}
                      disabled={sendingNotification}
                      className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
                    >
                      {sendingNotification ? '发送中...' : '发送通知'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setNotifyingPostKey(null)}
                      disabled={sendingNotification}
                      className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                    >
                      取消
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          )
        })}
      </div>

      {token && !loading && filtered.length > 0 && (
        <p className="mt-4 text-xs text-gray-400 text-right">共 {filtered.length} 条</p>
      )}
    </div>
  )
}

export default function AdminPostsPage() {
  return (
    <>
      <Suspense fallback={<div className="p-8 text-center text-gray-500">加载中...</div>}>
        <AdminPostsContent />
      </Suspense>
      <BackToTopButton />
    </>
  )
}
