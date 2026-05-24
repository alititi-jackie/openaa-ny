'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import type { NewsPost } from '@/types'
import { NEWS_CATEGORIES, NEWS_FILTER_CATEGORIES, NEWS_SLUG_REGEX } from '@/lib/news'
import type { NewsFilterCategory } from '@/lib/news'
import { clearAdminToken, getAdminToken, setAdminToken } from '@/lib/adminToken'
import BackToTopButton from '@/components/BackToTopButton'
import { useAutoMessage } from '@/hooks/useAutoMessage'

type StatusFilter = '全部状态' | '已发布' | '未发布'
type CoverSource = 'uploaded' | 'external'

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: '全部状态', label: '全部状态' },
  { key: '已发布', label: '已发布' },
  { key: '未发布', label: '未发布' },
]

type FormState = {
  title: string
  slug: string
  category: string
  summary: string
  cover_image_url: string
  content: string
  seo_title: string
  seo_description: string
  is_published: boolean
  is_pinned: boolean
  pinned_order: number
  pinned_until: string
}

const emptyForm: FormState = {
  title: '',
  slug: '',
  category: NEWS_CATEGORIES[0],
  summary: '',
  cover_image_url: '',
  content: '',
  seo_title: '',
  seo_description: '',
  is_published: false,
  is_pinned: false,
  pinned_order: 0,
  pinned_until: '',
}

function formatDate(value: string | null) {
  if (!value) return '-'
  try {
    return new Date(value).toLocaleString('zh-CN')
  } catch {
    return value
  }
}

function isNewsCoversUrl(url: string): boolean {
  return url.includes('/storage/v1/object/public/news-covers/')
}

function toDatetimeLocalValue(value: string | null | undefined): string {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const offset = d.getTimezoneOffset()
  const local = new Date(d.getTime() - offset * 60_000)
  return local.toISOString().slice(0, 16)
}

function formatPinnedUntil(value: string | null): string {
  if (!value) return '长期置顶'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  const pad = (num: number) => String(num).padStart(2, '0')
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function toSortableTime(value: string | null | undefined): number {
  if (!value) return 0
  const time = new Date(value).getTime()
  return Number.isNaN(time) ? 0 : time
}

function isEffectivePinned(post: NewsPost, nowTime: number): boolean {
  if (!post.is_pinned) return false
  if (!post.pinned_until) return true
  return toSortableTime(post.pinned_until) > nowTime
}

function getPublishedOrCreatedTime(post: NewsPost): number {
  return post.published_at ? toSortableTime(post.published_at) : toSortableTime(post.created_at)
}

export default function AdminNewsPage() {
  const [token, setToken] = useState('')
  const [inputToken, setInputToken] = useState('')
  const [isUsingUnifiedToken, setIsUsingUnifiedToken] = useState(false)
  const [showTokenEditor, setShowTokenEditor] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useAutoMessage()
  const [posts, setPosts] = useState<NewsPost[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [hasAccess, setHasAccess] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [deletingCover, setDeletingCover] = useState(false)
  const [uploadMessage, setUploadMessage] = useState('')
  const [coverSourceLock, setCoverSourceLock] = useState<CoverSource | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<NewsFilterCategory>('全部')
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>('全部状态')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLDivElement>(null)

  function scrollToForm() {
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  const fetchPosts = useCallback(async (adminToken: string) => {
    setLoading(true)
    setMessage('')
    const res = await fetch('/api/admin/news', {
      headers: { 'x-admin-token': adminToken },
    })
    const json: unknown = await res.json()

    if (res.status === 401) {
      setHasAccess(false)
      setMessage('无权限访问')
      setPosts([])
      setLoading(false)
      return
    }

    setHasAccess(true)
    if (
      json !== null &&
      typeof json === 'object' &&
      'data' in json &&
      Array.isArray((json as Record<string, unknown>).data)
    ) {
      setPosts((json as { data: NewsPost[] }).data)
    } else {
      setMessage(
        json !== null && typeof json === 'object' && 'error' in json
          ? String((json as Record<string, unknown>).error || '获取失败')
          : '获取失败'
      )
    }
    setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps -- only run on mount; setMessage from useAutoMessage is stable and its omission is intentional
  }, [])

  useEffect(() => {
    const stored = getAdminToken()
    if (stored) {
      setToken(stored)
      setInputToken(stored)
      setIsUsingUnifiedToken(true)
      fetchPosts(stored)
    } else {
      setHasAccess(false)
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
    setUploadMessage('')
    setShowForm(false)
    setEditingId(null)
    setForm(emptyForm)
    setHasAccess(true)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function startCreate() {
    setEditingId(null)
    setForm(emptyForm)
    setShowForm(true)
    setMessage('')
    setUploadMessage('')
    setCoverSourceLock(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function startEdit(post: NewsPost) {
    setEditingId(post.id)
    setForm({
      title: post.title,
      slug: post.slug,
      category: post.category,
      summary: post.summary || '',
      cover_image_url: post.cover_image_url || '',
      content: post.content,
      seo_title: post.seo_title || '',
      seo_description: post.seo_description || '',
      is_published: post.is_published,
      is_pinned: post.is_pinned === true,
      pinned_order:
        typeof post.pinned_order === 'number' && Number.isInteger(post.pinned_order) && post.pinned_order >= 0
          ? post.pinned_order
          : 0,
      pinned_until: toDatetimeLocalValue(post.pinned_until),
    })
    setShowForm(true)
    setMessage('')
    setUploadMessage('')
    setCoverSourceLock(post.cover_image_url ? (isNewsCoversUrl(post.cover_image_url) ? 'uploaded' : 'external') : null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    scrollToForm()
  }

  async function handleCoverImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (coverSourceLock !== null) return
    const file = e.target.files?.[0]
    if (!file) return

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    const allowedExts = ['jpg', 'jpeg', 'png', 'webp']
    const nameParts = file.name.split('.')
    const ext = nameParts.length > 1 ? (nameParts.pop() ?? '').toLowerCase() : ''
    if (!ext || !allowedTypes.includes(file.type) || !allowedExts.includes(ext)) {
      setUploadMessage('图片格式仅支持 JPG、PNG、WEBP')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadMessage('图片大小不能超过 5MB')
      return
    }

    setUploading(true)
    setUploadMessage('上传中...')

    const fd = new FormData()
    fd.append('file', file)
    fd.append('slug', form.slug.trim())

    try {
      const res = await fetch('/api/admin/news/upload-cover', {
        method: 'POST',
        headers: { 'x-admin-token': token },
        body: fd,
      })
      const json: unknown = await res.json()
      if (!res.ok) {
        const errMsg =
          json !== null && typeof json === 'object' && 'error' in json
            ? String((json as Record<string, unknown>).error || '上传失败')
            : '上传失败'
        setUploadMessage(errMsg)
        return
      }
      const url =
        json !== null && typeof json === 'object' && 'url' in json
          ? String((json as Record<string, unknown>).url || '')
          : ''
      setForm((prev) => ({ ...prev, cover_image_url: url }))
      setCoverSourceLock('uploaded')
      setUploadMessage('封面图上传成功')
    } catch {
      setUploadMessage('上传失败，请重试')
    } finally {
      setUploading(false)
    }
  }

  async function removeCoverImage() {
    const coverImageUrl = form.cover_image_url.trim()
    if (!coverImageUrl) return
    if (!confirm('确定要删除当前封面图吗？')) return

    setDeletingCover(true)
    setUploadMessage('')
    try {
      const shouldUseApi = Boolean(editingId) || isNewsCoversUrl(coverImageUrl)
      if (shouldUseApi) {
        const res = await fetch('/api/admin/news/cover', {
          method: 'DELETE',
          headers: {
            'x-admin-token': token,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ newsId: editingId, coverImageUrl }),
        })
        const json: unknown = await res.json()
        if (res.status === 401) {
          setHasAccess(false)
          setMessage('无权限访问')
          return
        }
        if (!res.ok) {
          setUploadMessage(
            json !== null && typeof json === 'object' && 'error' in json
              ? String((json as Record<string, unknown>).error || '删除图片失败，请稍后再试')
              : '删除图片失败，请稍后再试'
          )
          return
        }
        setUploadMessage(
          json !== null && typeof json === 'object' && 'message' in json
            ? String((json as Record<string, unknown>).message || '图片已删除')
            : '图片已删除'
        )
      } else {
        setUploadMessage('外部图片链接已从当前文章移除')
      }

      setForm((prev) => ({ ...prev, cover_image_url: '' }))
      setCoverSourceLock(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch {
      setUploadMessage('删除图片失败，请稍后再试')
    } finally {
      setDeletingCover(false)
    }
  }

  async function submitForm(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim() || !form.slug.trim() || !form.content.trim() || !form.category.trim()) {
      setMessage('请完整填写标题、slug、分类与正文')
      return
    }

    if (!NEWS_SLUG_REGEX.test(form.slug.trim())) {
      setMessage('Slug 只能使用英文小写、数字和短横线，例如 openaa-new-user-guide')
      return
    }

    if (!Number.isInteger(form.pinned_order) || form.pinned_order < 0) {
      setMessage('置顶排序必须是大于等于 0 的整数')
      return
    }

    setLoading(true)
    setMessage('')
    const endpoint = editingId ? `/api/admin/news/${editingId}` : '/api/admin/news'
    const method = editingId ? 'PATCH' : 'POST'

    const res = await fetch(endpoint, {
      method,
      headers: {
        'x-admin-token': token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...form,
        title: form.title.trim(),
        slug: form.slug.trim(),
        category: form.category.trim(),
        content: form.content.trim(),
        summary: form.summary.trim(),
        cover_image_url: form.cover_image_url.trim(),
        seo_title: form.seo_title.trim(),
        seo_description: form.seo_description.trim(),
        pinned_order: form.pinned_order,
        pinned_until: form.pinned_until.trim() || null,
      }),
    })

    const json: unknown = await res.json()
    if (res.status === 401) {
      setHasAccess(false)
      setMessage('无权限访问')
      setLoading(false)
      return
    }

    if (res.ok) {
      setMessage('保存成功')
      setShowForm(false)
      setEditingId(null)
      setForm(emptyForm)
      setCoverSourceLock(null)
      await fetchPosts(token)
    } else {
      setMessage(
        json !== null && typeof json === 'object' && 'error' in json
          ? String((json as Record<string, unknown>).error || '保存失败')
          : '保存失败'
      )
    }
    setLoading(false)
  }

  async function updatePublish(post: NewsPost, isPublished: boolean) {
    setLoading(true)
    const res = await fetch(`/api/admin/news/${post.id}`, {
      method: 'PATCH',
      headers: {
        'x-admin-token': token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ is_published: isPublished }),
    })
    if (res.status === 401) {
      setHasAccess(false)
      setMessage('无权限访问')
      setLoading(false)
      return
    }
    if (!res.ok) {
      const json: unknown = await res.json()
      setMessage(
        json !== null && typeof json === 'object' && 'error' in json
          ? String((json as Record<string, unknown>).error || '操作失败')
          : '操作失败'
      )
      setLoading(false)
      return
    }
    await fetchPosts(token)
    setLoading(false)
  }

  async function removePost(id: string) {
    if (!confirm('确定要删除这篇新闻吗？删除后不可恢复。')) return

    setLoading(true)
    const res = await fetch(`/api/admin/news/${id}`, {
      method: 'DELETE',
      headers: { 'x-admin-token': token },
    })
    if (res.status === 401) {
      setHasAccess(false)
      setMessage('无权限访问')
      setLoading(false)
      return
    }
    if (!res.ok) {
      setMessage('删除失败')
      setLoading(false)
      return
    }
    await fetchPosts(token)
    setLoading(false)
  }

  const sortedPosts = useMemo(
    () => {
      const nowTime = Date.now()
      return [...posts].sort((a, b) => {
        const aPinned = isEffectivePinned(a, nowTime)
        const bPinned = isEffectivePinned(b, nowTime)
        if (aPinned !== bPinned) return aPinned ? -1 : 1

        if (aPinned && bPinned) {
          const pinnedOrderDiff = (a.pinned_order ?? 0) - (b.pinned_order ?? 0)
          if (pinnedOrderDiff !== 0) return pinnedOrderDiff

          const createdAtDiff = toSortableTime(b.created_at) - toSortableTime(a.created_at)
          if (createdAtDiff !== 0) return createdAtDiff
        }

        const publishedDiff = getPublishedOrCreatedTime(b) - getPublishedOrCreatedTime(a)
        if (publishedDiff !== 0) return publishedDiff

        return toSortableTime(b.created_at) - toSortableTime(a.created_at)
      })
    },
    [posts]
  )

  const hasCoverImage = form.cover_image_url.trim().length > 0
  const isCoverLocked = coverSourceLock !== null

  const filteredPosts = useMemo(() => {
    return sortedPosts.filter((post) => {
      const matchCategory = selectedCategory === '全部' || post.category === selectedCategory
      const matchStatus =
        selectedStatus === '全部状态' ||
        (selectedStatus === '已发布' ? post.is_published : !post.is_published)
      return matchCategory && matchStatus
    })
  }, [sortedPosts, selectedCategory, selectedStatus])

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Link
        href="/admin"
        className="mb-4 inline-flex items-center rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50"
      >
        ← 返回总后台
      </Link>
      <div className="mb-6 mt-3 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">新闻管理</h1>
        <button
          type="button"
          onClick={startCreate}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white"
        >
          + 新增新闻
        </button>
      </div>

      {!token ? (
        <div className="mb-6 rounded-xl border bg-gray-50 p-4">
          <label className="mb-1 block text-sm font-medium">Admin Token</label>
          {!hasAccess ? <p className="mb-2 text-sm text-red-500">无权限访问</p> : null}
          <div className="flex gap-2">
            <input
              type="password"
              value={inputToken}
              onChange={(e) => setInputToken(e.target.value)}
              placeholder="输入管理 Token"
              className="flex-1 rounded-lg border px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={saveToken}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white"
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

      {showForm ? (
        <div ref={formRef} className="scroll-mt-24">
          <form onSubmit={submitForm} className="mb-6 space-y-3 rounded-xl border bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">{editingId ? '编辑新闻' : '新增新闻'}</h2>
          <select
            value={form.category}
            onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
            className="w-full rounded-lg border px-3 py-2 text-sm"
          >
            {NEWS_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <input
            value={form.title}
            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            placeholder="标题 *"
            className="w-full rounded-lg border px-3 py-2 text-sm"
          />
          <input
            value={form.slug}
            onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
            placeholder="slug *"
            className="w-full rounded-lg border px-3 py-2 text-sm"
          />
          <input
            value={form.summary}
            onChange={(e) => setForm((prev) => ({ ...prev, summary: e.target.value }))}
            placeholder="摘要"
            className="w-full rounded-lg border px-3 py-2 text-sm"
          />
          <input
            value={form.seo_title}
            onChange={(e) => setForm((prev) => ({ ...prev, seo_title: e.target.value }))}
            placeholder="SEO 标题"
            className="w-full rounded-lg border px-3 py-2 text-sm"
          />
          <textarea
            value={form.seo_description}
            onChange={(e) => setForm((prev) => ({ ...prev, seo_description: e.target.value }))}
            placeholder="SEO 描述"
            rows={3}
            className="w-full rounded-lg border px-3 py-2 text-sm"
          />
          <textarea
            value={form.content}
            onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
            placeholder="正文 *"
            rows={8}
            className="w-full rounded-lg border px-3 py-2 text-sm"
          />
          {/* Cover image upload section */}
          <div className="space-y-2 rounded-lg border p-3">
            <p className="text-sm font-medium">封面图</p>
            <div className="flex items-center gap-2">
              <label
                className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                  isCoverLocked
                    ? 'cursor-not-allowed bg-gray-100 text-gray-400'
                    : 'cursor-pointer bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}
              >
                {uploading ? '上传中...' : '上传封面图'}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  disabled={uploading || isCoverLocked || deletingCover}
                  onChange={handleCoverImageUpload}
                />
              </label>
              {uploadMessage ? (
                <span
                  className={`text-xs ${uploadMessage.includes('成功') ? 'text-green-600' : uploadMessage === '上传中...' ? 'text-gray-500' : 'text-red-500'}`}
                >
                  {uploadMessage}
                </span>
              ) : null}
            </div>
            <input
              value={form.cover_image_url}
              onChange={(e) => {
                if (isCoverLocked) return
                setForm((prev) => ({ ...prev, cover_image_url: e.target.value }))
              }}
              onBlur={() => {
                const trimmed = form.cover_image_url.trim()
                if (!trimmed || isCoverLocked) return
                setForm((prev) => ({ ...prev, cover_image_url: trimmed }))
                setCoverSourceLock(isNewsCoversUrl(trimmed) ? 'uploaded' : 'external')
              }}
              placeholder="封面图 URL"
              disabled={isCoverLocked || deletingCover}
              className="w-full rounded-lg border px-3 py-2 text-sm disabled:bg-gray-100 disabled:text-gray-500"
            />
            {isCoverLocked ? (
              <p className="text-xs text-amber-700">
                {coverSourceLock === 'uploaded'
                  ? '已使用上传图片，如需改用外部链接，请先删除当前图片。'
                  : '已使用外部图片链接，如需上传图片，请先删除当前图片。'}
              </p>
            ) : (
              <p className="text-xs text-gray-500">如需更换封面图，请先删除当前图片。</p>
            )}
            {isCoverLocked && hasCoverImage ? (
              <button
                type="button"
                onClick={removeCoverImage}
                disabled={uploading || deletingCover}
                className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deletingCover ? '删除中...' : '删除图片'}
              </button>
            ) : null}
            {form.cover_image_url ? (
              <div className="mt-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={form.cover_image_url}
                  alt="封面图预览"
                  className="max-h-40 rounded-lg object-cover"
                  onError={(e) => {
                    ;(e.currentTarget as HTMLImageElement).style.display = 'none'
                  }}
                  onLoad={(e) => {
                    ;(e.currentTarget as HTMLImageElement).style.display = ''
                  }}
                />
              </div>
            ) : null}
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.is_published}
              onChange={(e) => setForm((prev) => ({ ...prev, is_published: e.target.checked }))}
            />
            立即发布
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.is_pinned}
              onChange={(e) => setForm((prev) => ({ ...prev, is_pinned: e.target.checked }))}
            />
            置顶新闻
          </label>
            <div>
              <label className="mb-1 block text-sm font-medium">置顶排序</label>
              <p className="mb-1 text-xs text-gray-500">
                数字越小越靠前，0 为最高优先级；数字相同时，发布时间较新的排前。
              </p>
              <input
                type="number"
                min={0}
                step={1}
                value={form.pinned_order}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, pinned_order: Math.max(0, Number(e.target.value) || 0) }))
                }
                placeholder="请输入置顶排序"
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
          <div>
            <p className="mb-1 text-xs text-gray-500">置顶到期时间（可选，留空表示长期置顶）</p>
            <input
              type="datetime-local"
              value={form.pinned_until}
              onChange={(e) => setForm((prev) => ({ ...prev, pinned_until: e.target.value }))}
              className="w-full rounded-lg border px-3 py-2 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              保存
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false)
                setEditingId(null)
                setForm(emptyForm)
                setUploadMessage('')
                setCoverSourceLock(null)
                if (fileInputRef.current) fileInputRef.current.value = ''
              }}
              className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700"
            >
              取消
            </button>
          </div>
          </form>
        </div>
      ) : null}

      {message ? (
        <p className={`mb-4 text-sm ${message.includes('成功') ? 'text-green-600' : 'text-red-500'}`}>
          {message}
        </p>
      ) : null}

      {loading ? <p className="text-sm text-gray-500">加载中...</p> : null}

      {/* News filters */}
      <div className="mb-4 space-y-2">
        {/* Category filters */}
        <div className="-mx-1 overflow-x-auto overflow-y-hidden [touch-action:pan-x] [overscroll-behavior-x:contain] [overscroll-behavior-y:contain]">
          <div className="flex flex-nowrap gap-2 px-1 whitespace-nowrap">
            {NEWS_FILTER_CATEGORIES.map((cat) => {
              const active = selectedCategory === cat
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={
                    `px-3 py-1 rounded-full text-xs font-medium border ` +
                    (active
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200')
                  }
                >
                  {cat}
                </button>
              )
            })}
          </div>
        </div>

        {/* Status filters */}
        <div className="-mx-1 overflow-x-auto overflow-y-hidden [touch-action:pan-x] [overscroll-behavior-x:contain] [overscroll-behavior-y:contain]">
          <div className="flex flex-nowrap gap-2 px-1 whitespace-nowrap">
            {STATUS_FILTERS.map((item) => {
              const active = selectedStatus === item.key
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setSelectedStatus(item.key)}
                  className={
                    `px-3 py-1 rounded-full text-xs font-medium border ` +
                    (active
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200')
                  }
                >
                  {item.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {!loading && filteredPosts.length === 0 && (
          <p className="text-sm text-gray-400">暂无符合条件的新闻</p>
        )}
        {filteredPosts.map((post) => (
          <div key={post.id} className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm">
            <p className="text-base font-bold leading-snug text-zinc-900 line-clamp-2 break-words">{post.title}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="rounded-full bg-zinc-50 px-2 py-0.5 text-xs text-zinc-600 ring-1 ring-zinc-100">{post.category}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs ring-1 ${
                  post.is_published
                    ? 'bg-blue-50 text-blue-700 ring-blue-100'
                    : 'bg-gray-50 text-gray-600 ring-gray-200'
                }`}
              >
                {post.is_published ? '已发布' : '草稿'}
              </span>
              {post.is_pinned ? (
                <>
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">已置顶</span>
                  <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700 ring-1 ring-indigo-100">
                    排序 {post.pinned_order ?? 0}
                  </span>
                  <span className="rounded-full bg-purple-50 px-2 py-0.5 text-xs text-purple-700 ring-1 ring-purple-100 break-words">
                    {post.pinned_until ? `到期：${formatPinnedUntil(post.pinned_until)}` : '长期置顶'}
                  </span>
                </>
              ) : null}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-zinc-500">
              <span>发布时间：{formatDate(post.published_at)}</span>
              <span>更新时间：{formatDate(post.updated_at)}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => startEdit(post)}
                  className="rounded-lg border border-blue-300 px-3 py-1.5 text-xs font-medium text-blue-700"
                >
                  置顶设置
                </button>
                <button
                  type="button"
                  onClick={() => startEdit(post)}
                  className="rounded-lg border px-3 py-1.5 text-xs font-medium text-gray-700"
                >
                  编辑
                </button>
                {post.is_published ? (
                  <button
                    type="button"
                    onClick={() => updatePublish(post, false)}
                    className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-medium text-amber-700"
                  >
                    下架
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => updatePublish(post, true)}
                    className="rounded-lg border border-blue-300 px-3 py-1.5 text-xs font-medium text-blue-700"
                  >
                    发布
                  </button>
                )}
                {post.is_published ? (
                  <Link
                    href={`/news/${post.slug}?from_admin=1&return_to=/admin/news`}
                    target="_blank"
                    className="rounded-lg border px-3 py-1.5 text-xs font-medium text-gray-700"
                  >
                    查看
                  </Link>
                ) : null}
                <button
                  type="button"
                  onClick={() => removePost(post.id)}
                  className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600"
                >
                  删除
                </button>
            </div>
          </div>
        ))}
      </div>
      <BackToTopButton />
    </div>
  )
}
