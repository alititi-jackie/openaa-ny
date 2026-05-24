'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { clearAdminToken, getAdminToken, setAdminToken } from '@/lib/adminToken'
import {
  AD_EXTERNAL_URL_ERROR,
  AD_IMAGE_REQUIRED_ERROR,
  AD_INTERNAL_SLUG_ERROR,
  isHttpUrl,
  isValidAdSlug,
  normalizeAdSlug,
} from '@/lib/ads'
import BackToTopButton from '@/components/BackToTopButton'
import { useAutoMessage } from '@/hooks/useAutoMessage'

interface Ad {
  id: string
  image_url: string
  link_url?: string | null
  link_type?: string | null
  external_url?: string | null
  slug?: string | null
  content?: string | null
  contact_name?: string | null
  phone?: string | null
  wechat?: string | null
  open_mode?: 'internal' | 'external_new' | 'external_same' | string | null
  position: string
  start_date: string | null
  end_date: string | null
  is_active: boolean
  created_at: string
}

type PositionFilter = 'all' | 'home' | 'jobs' | 'housing' | 'secondhand' | 'navigation' | 'services' | 'news' | 'dmv'
type ImageSourceLock = 'uploaded' | 'external'

const POSITION_FILTERS: { key: PositionFilter, label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'home', label: '首页广告' },
  { key: 'jobs', label: '招聘广告' },
  { key: 'housing', label: '房屋广告' },
  { key: 'secondhand', label: '二手广告' },
  { key: 'navigation', label: '导航广告' },
  { key: 'services', label: '本地服务广告' },
  { key: 'news', label: '新闻广告' },
  { key: 'dmv', label: 'DMV广告' },
]

type StatusFilter = 'all' | 'active' | 'inactive'

const STATUS_FILTERS: { key: StatusFilter, label: string }[] = [
  { key: 'all', label: '全部状态' },
  { key: 'active', label: '启用中' },
  { key: 'inactive', label: '已停用' },
]

function getPositionLabel(position: string) {
  const map: Record<string, string> = {
    home: '首页广告',
    jobs: '招聘广告',
    housing: '房屋广告',
    secondhand: '二手广告',
    navigation: '导航广告',
    services: '本地服务广告',
    news: '新闻广告',
    dmv: 'DMV广告',
  }
  return map[position] || position
}

function isAdsStorageUrl(url: string): boolean {
  return url.includes('/storage/v1/object/public/ads/')
}

function toDateTimeLocalValue(value: string | null): string {
  if (!value) return ''
  return value.replace(' ', 'T').slice(0, 16)
}

function AdsAdminContent() {
  const searchParams = useSearchParams()
  const [token, setToken] = useState('')
  const [tokenInput, setTokenInput] = useState('')
  const [isUsingUnifiedToken, setIsUsingUnifiedToken] = useState(false)
  const [showTokenEditor, setShowTokenEditor] = useState(false)
  const [ads, setAds] = useState<Ad[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useAutoMessage()
  const [uploadMessage, setUploadMessage] = useState('')
  const [uploading, setUploading] = useState(false)
  const [deletingImage, setDeletingImage] = useState(false)
  const [imageUrl, setImageUrl] = useState('')
  const [imageSourceLock, setImageSourceLock] = useState<ImageSourceLock | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [openMode, setOpenMode] = useState<'internal' | 'external_new' | 'external_same'>('external_new')
  const [externalUrl, setExternalUrl] = useState('')
  const [slug, setSlug] = useState('')
  const [content, setContent] = useState('')
  const [contactName, setContactName] = useState('')
  const [phone, setPhone] = useState('')
  const [wechat, setWechat] = useState('')
  const [position, setPosition] = useState<'home' | 'jobs' | 'secondhand' | 'navigation' | 'housing' | 'services' | 'news' | 'dmv'>('home')
  const [isActive, setIsActive] = useState(true)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [activePosition, setActivePosition] = useState<PositionFilter>('all')
  const [activeStatus, setActiveStatus] = useState<StatusFilter>('all')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement | null>(null)

  const filteredAds = ads.filter((ad) => {
    const matchPosition = activePosition === 'all' ? true : ad.position === activePosition
    const matchStatus = activeStatus === 'all'
      ? true
      : activeStatus === 'active'
        ? ad.is_active === true
        : ad.is_active === false

    return matchPosition && matchStatus
  })

  useEffect(() => {
    const qToken = (searchParams.get('token') || '').trim()
    const stored = getAdminToken().trim()
    const t = qToken || stored || ''
    if (qToken) setAdminToken(qToken)
    setToken(t)
    setTokenInput(t)
    setIsUsingUnifiedToken(Boolean(t))
    if (t) fetchAds(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function resetForm() {
    setEditingId(null)
    setImageUrl('')
    setImageSourceLock(null)
    setOpenMode('external_new')
    setExternalUrl('')
    setSlug('')
    setContent('')
    setContactName('')
    setPhone('')
    setWechat('')
    setPosition('home')
    setIsActive(true)
    setStartDate('')
    setEndDate('')
    setUploadMessage('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function startEdit(ad: Ad) {
    const normalizedImageUrl = (ad.image_url || '').trim()
    setEditingId(ad.id)
    setImageUrl(normalizedImageUrl)
    setImageSourceLock(normalizedImageUrl ? (isAdsStorageUrl(normalizedImageUrl) ? 'uploaded' : 'external') : null)

    const nextOpenMode = ad.open_mode === 'internal' || ad.open_mode === 'external_new' || ad.open_mode === 'external_same'
      ? ad.open_mode
      : (ad.link_type === 'internal' ? 'internal' : 'external_new')

    setOpenMode(nextOpenMode)
    setExternalUrl(ad.external_url || ad.link_url || '')
    setSlug(ad.slug || '')
    setContent(ad.content || '')
    setContactName(ad.contact_name || '')
    setPhone(ad.phone || '')
    setWechat(ad.wechat || '')
    setPosition(ad.position as 'home' | 'jobs' | 'secondhand' | 'navigation' | 'housing' | 'services' | 'news')
    setIsActive(ad.is_active)
    setStartDate(toDateTimeLocalValue(ad.start_date))
    setEndDate(toDateTimeLocalValue(ad.end_date))
    setMessage('')
    setUploadMessage('')
    if (fileInputRef.current) fileInputRef.current.value = ''
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  async function fetchAds(t: string) {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/ads', {
        headers: { 'x-admin-token': t },
      })
      const json: unknown = await res.json()
      if (json !== null && typeof json === 'object' && 'data' in json && Array.isArray((json as Record<string, unknown>).data)) {
        setAds((json as { data: Ad[] }).data)
      } else {
        setMessage(
          json !== null && typeof json === 'object' && 'error' in json
            ? String((json as Record<string, unknown>).error || '获取失败')
            : '获取失败'
        )
      }
    } catch {
      setMessage('网络错误')
    }
    setLoading(false)
  }

  function saveToken() {
    const nextToken = tokenInput.trim()
    if (!nextToken) {
      setMessage('请输入 Admin Token')
      return
    }
    setAdminToken(nextToken)
    setToken(nextToken)
    setTokenInput(nextToken)
    setIsUsingUnifiedToken(true)
    setShowTokenEditor(false)
    setMessage('')
    fetchAds(nextToken)
  }

  function logoutAdmin() {
    clearAdminToken()
    setToken('')
    setTokenInput('')
    setIsUsingUnifiedToken(false)
    setShowTokenEditor(false)
    setAds([])
    setMessage('')
    setUploadMessage('')
    resetForm()
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (imageSourceLock !== null) return
    const file = e.target.files?.[0]
    if (!file) return

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    const allowedExts = ['jpg', 'jpeg', 'png', 'webp']
    const fileExt = (file.name.split('.').pop() || '').toLowerCase()
    if (!fileExt || !allowedTypes.includes(file.type) || !allowedExts.includes(fileExt)) {
      setUploadMessage('图片格式仅支持 JPG、PNG、WEBP')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadMessage('图片大小不能超过 5MB')
      return
    }

    setUploading(true)
    setUploadMessage('上传中...')

    const form = new FormData()
    form.append('file', file)
    if (slug.trim()) form.append('slug', slug.trim())

    try {
      const res = await fetch('/api/admin/ads/upload-image', {
        method: 'POST',
        headers: { 'x-admin-token': token },
        body: form,
      })

      const json: unknown = await res.json()
      if (!res.ok) {
        setUploadMessage(
          json !== null && typeof json === 'object' && 'error' in json
            ? String((json as Record<string, unknown>).error || '上传失败')
            : '上传失败'
        )
        return
      }

      const url =
        json !== null && typeof json === 'object' && 'url' in json
          ? String((json as Record<string, unknown>).url || '')
          : ''
      setImageUrl(url)
      setImageSourceLock('uploaded')
      setUploadMessage('广告图片上传成功')
    } catch {
      setUploadMessage('上传失败，请重试')
    } finally {
      setUploading(false)
    }
  }

  async function removeImage() {
    const currentImageUrl = imageUrl.trim()
    const currentAdId = editingId?.trim() ?? ''
    const adminToken = token.trim()
    if (!currentImageUrl) return
    if (!confirm('确定要删除当前广告图片吗？')) return

    setDeletingImage(true)
    setUploadMessage('')

    try {
      const shouldUseApi = Boolean(editingId) || isAdsStorageUrl(currentImageUrl)
      if (shouldUseApi) {
        if (!currentAdId) {
          setUploadMessage('删除图片失败：Missing adId')
          return
        }

        if (!adminToken) {
          setUploadMessage('删除图片失败：Missing admin token')
          return
        }

        const res = await fetch('/api/admin/ads/image', {
          method: 'DELETE',
          headers: {
            'x-admin-token': adminToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ adId: currentAdId, imageUrl: currentImageUrl }),
        })

        const json: unknown = await res.json()
        const getTextField = (field: string) => (
          json !== null
          && typeof json === 'object'
          && field in json
          && typeof (json as Record<string, unknown>)[field] === 'string'
            ? String((json as Record<string, unknown>)[field] || '').trim()
            : ''
        )
        const getBoolField = (field: string) => (
          json !== null
          && typeof json === 'object'
          && field in json
          && Boolean((json as Record<string, unknown>)[field])
        )
        if (!res.ok) {
          const apiError = getTextField('error')
          const apiDetails = getTextField('details')
          const defaultErrorMessage = '删除图片失败，请稍后再试'

          if (apiError && apiDetails) {
            setUploadMessage(`删除图片失败：${apiError} - ${apiDetails}`)
            return
          }

          if (apiError) {
            setUploadMessage(
              apiError === defaultErrorMessage
                ? defaultErrorMessage
                : `删除图片失败：${apiError}`
            )
            return
          }

          setUploadMessage(
            apiDetails
              ? `删除图片失败：${apiDetails}`
              : defaultErrorMessage
          )
          return
        }

        const imageUrlCleared = getBoolField('imageUrlCleared')
        if (currentAdId && !imageUrlCleared) {
          setUploadMessage('删除图片失败，请稍后再试')
          return
        }

        const storageDeleteAttempted = getBoolField('storageDeleteAttempted')
        const storageFileDeleted = getBoolField('storageFileDeleted')

        setUploadMessage(
          storageDeleteAttempted && !storageFileDeleted
            ? '图片已从广告中移除，Storage 文件清理稍后可再处理'
            : '图片已删除，可以重新上传或填写外部链接'
        )
      } else {
        setUploadMessage('图片已删除，可以重新上传或填写外部链接')
      }

      setImageUrl('')
      setImageSourceLock(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      if (currentAdId) await fetchAds(adminToken)
    } catch {
      setUploadMessage('删除图片失败，请稍后再试')
    } finally {
      setDeletingImage(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const finalImageUrl = imageUrl.trim()
    if (!finalImageUrl) {
      setMessage(AD_IMAGE_REQUIRED_ERROR)
      return
    }
    if (!isHttpUrl(finalImageUrl)) {
      setMessage('图片链接必须以 http:// 或 https:// 开头')
      return
    }

    const normalizedSlug = normalizeAdSlug(slug)
    const normalizedExternalUrl = externalUrl.trim()

    if (openMode === 'internal') {
      if (!normalizedSlug || !isValidAdSlug(normalizedSlug)) {
        setMessage(AD_INTERNAL_SLUG_ERROR)
        return
      }
    } else if (!normalizedExternalUrl || !isHttpUrl(normalizedExternalUrl)) {
      setMessage(AD_EXTERNAL_URL_ERROR)
      return
    }

    const effectiveLinkType: 'external' | 'internal' = openMode === 'internal' ? 'internal' : 'external'

    setSubmitting(true)
    setMessage('')

    const payload = {
      image_url: finalImageUrl,
      link_type: effectiveLinkType,
      open_mode: openMode,
      link_url: effectiveLinkType === 'external' ? normalizedExternalUrl : null,
      external_url: effectiveLinkType === 'external' ? normalizedExternalUrl : null,
      slug: effectiveLinkType === 'internal' ? normalizedSlug : null,
      content: effectiveLinkType === 'internal' ? content : null,
      contact_name: contactName.trim() || null,
      phone: phone.trim() || null,
      wechat: wechat.trim() || null,
      position,
      is_active: isActive,
      start_date: startDate || null,
      end_date: endDate || null,
    }

    try {
      const endpoint = editingId ? `/api/admin/ads/${editingId}` : '/api/admin/ads'
      const method = editingId ? 'PATCH' : 'POST'
      const res = await fetch(endpoint, {
        method,
        headers: {
          'x-admin-token': token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const json: unknown = await res.json()
      if (!res.ok) {
        setMessage(
          json !== null && typeof json === 'object' && 'error' in json
            ? String((json as Record<string, unknown>).error || (editingId ? '更新失败' : '创建失败'))
            : (editingId ? '更新失败' : '创建失败')
        )
        return
      }

      setMessage(editingId ? '更新成功' : '创建成功')
      resetForm()
      fetchAds(token)
    } catch {
      setMessage('网络错误')
    } finally {
      setSubmitting(false)
    }
  }

  async function toggleActive(ad: Ad) {
    try {
      const res = await fetch(`/api/admin/ads/${ad.id}`, {
        method: 'PATCH',
        headers: { 'x-admin-token': token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !ad.is_active }),
      })
      const json: unknown = await res.json()
      if (json !== null && typeof json === 'object' && 'data' in json) fetchAds(token)
      else {
        setMessage(
          json !== null && typeof json === 'object' && 'error' in json
            ? String((json as Record<string, unknown>).error || '更新失败')
            : '更新失败'
        )
      }
    } catch {
      setMessage('网络错误')
    }
  }

  async function deleteAd(id: string) {
    if (!confirm('确定删除这条广告?')) return
    try {
      const res = await fetch(`/api/admin/ads/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-token': token },
      })
      const json: unknown = await res.json()
      if (json !== null && typeof json === 'object' && 'success' in json && (json as Record<string, unknown>).success) {
        fetchAds(token)
      } else {
        setMessage(
          json !== null && typeof json === 'object' && 'error' in json
            ? String((json as Record<string, unknown>).error || '删除失败')
            : '删除失败'
        )
      }
    } catch {
      setMessage('网络错误')
    }
  }

  if (!token) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Link
          href="/admin"
          className="mb-4 inline-flex items-center rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50"
        >
          ← 返回总后台
        </Link>
        <h1 className="text-2xl font-bold mb-6 mt-3">广告管理</h1>
        <div className="mb-6 rounded-xl border bg-gray-50 p-4">
          <label className="block text-sm font-medium mb-1">Admin Token</label>
          <div className="flex gap-2">
            <input
              type="password"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
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
      </div>
    )
  }

  const trimmedImageUrl = imageUrl.trim()
  const hasImage = trimmedImageUrl.length > 0
  const hasPreviewImage = hasImage && isHttpUrl(trimmedImageUrl)
  const isImageLocked = imageSourceLock !== null
  const uploadDisabled = uploading || isImageLocked || deletingImage || (hasImage && imageSourceLock !== 'uploaded')

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link
        href="/admin"
        className="mb-4 inline-flex items-center rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50"
      >
        ← 返回总后台
      </Link>
      <h1 className="text-2xl font-bold mb-6 mt-3">广告管理</h1>

      {/* Token state */}
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
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
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

      {/* Create/edit form */}
      <form ref={formRef} onSubmit={handleSubmit} className="scroll-mt-20 mb-8 p-4 bg-white rounded-xl border shadow-sm space-y-4">
        <h2 className="text-lg font-semibold">{editingId ? '编辑广告' : '新增广告'}</h2>

        <div className="space-y-2 rounded-lg border p-3">
          <p className="text-sm font-medium">广告图片 *</p>
          <div className="flex items-center gap-2">
            <label
              className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                uploadDisabled
                  ? 'cursor-not-allowed bg-gray-100 text-gray-400'
                  : 'cursor-pointer bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              {uploading ? '上传中...' : '上传广告图'}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                disabled={uploadDisabled}
                onChange={handleImageUpload}
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
            value={imageUrl}
            onChange={(e) => {
              if (isImageLocked) return
              const value = e.target.value
              setImageUrl(value)
              if (!value.trim()) {
                setImageSourceLock(null)
                setUploadMessage('')
              }
            }}
              onBlur={() => {
                const trimmed = imageUrl.trim()
                if (!trimmed || isImageLocked) return
                if (!isHttpUrl(trimmed)) {
                  setUploadMessage('图片链接必须以 http:// 或 https:// 开头')
                  return
                }
              setImageUrl(trimmed)
              setImageSourceLock(isAdsStorageUrl(trimmed) ? 'uploaded' : 'external')
              setUploadMessage('')
            }}
            placeholder="外部图片 URL（例如 https://img.openaa.com/banners/xxx.jpg）"
            disabled={isImageLocked || deletingImage}
            className="w-full rounded-lg border px-3 py-2 text-sm disabled:bg-gray-100 disabled:text-gray-500"
          />

          {isImageLocked ? (
            <p className="text-xs text-amber-700">
              {imageSourceLock === 'uploaded'
                ? '已使用上传图片，如需改用外部链接，请先删除当前图片。'
                : '已使用外部图片链接，如需上传图片，请先删除当前图片。'}
            </p>
          ) : (
            <p className="text-xs text-gray-500">上传图片与外部链接二选一。若已存在图片，请先删除后再更换。</p>
          )}

          {isImageLocked && hasImage ? (
            <button
              type="button"
              onClick={removeImage}
              disabled={uploading || deletingImage}
              className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {deletingImage ? '删除中...' : '删除图片'}
            </button>
          ) : null}

          {hasPreviewImage ? (
            <div className="mt-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={trimmedImageUrl}
                alt="广告图预览"
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

        {/* Open mode selector */}
        <div>
          <label className="block text-sm font-medium mb-2">打开方式 (Open mode) *</label>
          <select
            value={openMode}
            onChange={(e) => setOpenMode(e.target.value as 'internal' | 'external_new' | 'external_same')}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          >
            <option value="internal">内部详情页</option>
            <option value="external_new">外部链接 - 新窗口</option>
            <option value="external_same">外部链接 - 当前窗口</option>
          </select>
        </div>

        {/* External URL */}
        {openMode !== 'internal' && (
          <div>
            <label className="block text-sm font-medium mb-1">外部链接地址 *</label>
            <input
              type="url"
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              onBlur={() => setExternalUrl((prev) => prev.trim())}
              placeholder="https://example.com"
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">必须以 http:// 或 https:// 开头。</p>
          </div>
        )}

        {/* Internal slug + content */}
        {openMode === 'internal' && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">页面标识 (slug) *</label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase())}
                onBlur={() => setSlug((prev) => normalizeAdSlug(prev))}
                placeholder="e.g. summer-sale-2024"
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
              <p className="text-xs text-gray-400 mt-1">
                只能使用小写字母、数字和短横线，访问路径将为 /ads/{normalizeAdSlug(slug) || '你的标识'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">详情内容（可选）</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="广告详细描述..."
                rows={4}
                className="w-full border rounded-lg px-3 py-2 text-sm resize-y"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">联系人（可选）</label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="请输入联系人"
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">联系电话（可选）</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="请输入联系电话"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">微信号（可选）</label>
                <input
                  type="text"
                  value={wechat}
                  onChange={(e) => setWechat(e.target.value)}
                  placeholder="请输入微信号"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
          </>
        )}

        <div>
          <label className="block text-sm font-medium mb-1">位置</label>
          <select
            value={position}
            onChange={(e) => setPosition(e.target.value as 'home' | 'jobs' | 'secondhand' | 'navigation' | 'housing' | 'services' | 'news' | 'dmv')}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          >
            <option value="home">首页 (home)</option>
            <option value="jobs">招聘 (jobs)</option>
            <option value="secondhand">二手 (secondhand)</option>
            <option value="navigation">导航页 (navigation)</option>
            <option value="housing">房屋 (housing)</option>
            <option value="services">本地服务 (services)</option>
            <option value="news">新闻 (news)</option>
            <option value="dmv">DMV广告 (dmv)</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="is_active"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          <label htmlFor="is_active" className="text-sm font-medium">立即启用</label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">开始日期（可选）</label>
            <input
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">结束日期（可选）</label>
            <input
              type="datetime-local"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>

        {message && (
          <p className={`text-sm ${message.includes('成功') ? 'text-green-600' : 'text-red-500'}`}>
            {message}
          </p>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50"
          >
            {submitting ? '处理中...' : (editingId ? '保存修改' : '提交广告')}
          </button>
          {editingId ? (
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 border rounded-lg text-sm font-medium text-gray-700"
            >
              取消编辑
            </button>
          ) : null}
        </div>
      </form>

      {/* Ad list */}
      <div>
        <h2 className="text-lg font-semibold mb-3">现有广告</h2>

        {/* Filters */}
        <div className="space-y-2">
          {/* Position filters */}
          <div className="-mx-1 overflow-x-auto overflow-y-hidden [touch-action:pan-x] [overscroll-behavior-x:contain] [overscroll-behavior-y:contain]">
            <div className="flex flex-nowrap gap-2 px-1 whitespace-nowrap">
              {POSITION_FILTERS.map((item) => {
                const active = activePosition === item.key
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setActivePosition(item.key)}
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

          {/* Status filters */}
          <div className="-mx-1 overflow-x-auto overflow-y-hidden [touch-action:pan-x] [overscroll-behavior-x:contain] [overscroll-behavior-y:contain]">
            <div className="flex flex-nowrap gap-2 px-1 whitespace-nowrap">
              {STATUS_FILTERS.map((item) => {
                const active = activeStatus === item.key
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setActiveStatus(item.key)}
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

        {loading && <p className="text-sm text-gray-500">加载中...</p>}

        {!loading && filteredAds.length === 0 && (
          <p className="text-sm text-gray-400">暂无符合条件的广告</p>
        )}

        <ul className="space-y-3">
          {filteredAds.map((ad) => (
            <li key={ad.id} className="p-4 bg-white rounded-xl border shadow-sm flex gap-3 items-start">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={ad.image_url}
                alt=""
                className="w-20 h-14 object-cover rounded-lg flex-shrink-0 bg-gray-100"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 truncate">
                  {(ad.open_mode === 'internal' || ad.link_type === 'internal')
                    ? `/ads/${ad.slug ?? ''}`
                    : (ad.external_url || ad.link_url || '')}
                </p>
                <p className="text-xs mt-1">
                  <span className="font-medium">位置:</span> {getPositionLabel(ad.position)}
                  {' · '}
                  <span className={`font-medium ${ad.open_mode === 'internal' || ad.link_type === 'internal' ? 'text-purple-600' : 'text-blue-600'}`}>
                    {(ad.open_mode === 'internal' || ad.link_type === 'internal') ? '内部页' : '外部链接'}
                  </span>
                  {' · '}
                  <span className={ad.is_active ? 'text-green-600' : 'text-gray-400'}>
                    {ad.is_active ? '启用' : '停用'}
                  </span>
                </p>
                {(ad.start_date || ad.end_date) && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    {ad.start_date ? ad.start_date.slice(0, 10) : '—'} →{' '}
                    {ad.end_date ? ad.end_date.slice(0, 10) : '—'}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-1.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => startEdit(ad)}
                  className="text-xs px-3 py-1 rounded-lg border font-medium"
                >
                  编辑
                </button>
                <button
                  type="button"
                  onClick={() => toggleActive(ad)}
                  className="text-xs px-3 py-1 rounded-lg border font-medium"
                >
                  {ad.is_active ? '停用' : '启用'}
                </button>
                <button
                  type="button"
                  onClick={() => deleteAd(ad.id)}
                  className="text-xs px-3 py-1 rounded-lg border border-red-300 text-red-500 font-medium"
                >
                  删除
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default function AdsAdminPage() {
  return (
    <>
      <Suspense fallback={<div className="p-8 text-center text-gray-500">加载中...</div>}>
        <AdsAdminContent />
      </Suspense>
      <BackToTopButton />
    </>
  )
}
