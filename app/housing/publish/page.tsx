'use client'

import Link from 'next/link'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  assertUserCanCreateContent,
  assertUserCanEditOwnContent,
  BANNED_ACCOUNT_MESSAGE,
} from '@/lib/accountStatus'
import { checkDailyPostLimit } from '@/lib/checkDailyPostLimit'
import { DEFAULT_LOCATION, LOCATION_OPTIONS } from '@/lib/locationOptions'
import { compressImageFile, getCompressImageErrorMessage } from '@/lib/compressImage'
import { validateContactFields, CONTACT_MISSING_MESSAGE } from '@/lib/contactValidation'
import type { HousingPost, HousingPostType } from '@/types'

type PreviewImage =
  | { kind: 'remote'; url: string }
  | { kind: 'local'; url: string; file: File }

const HOUSING_LOCATIONS = LOCATION_OPTIONS

type HousingLocation = (typeof HOUSING_LOCATIONS)[number]

type PublishMode = HousingPostType

function normalizeType(v: string | null): PublishMode {
  return v === 'seeking' ? 'seeking' : 'renting'
}

function normalizeLocation(v: unknown): HousingLocation {
  return HOUSING_LOCATIONS.includes(v as HousingLocation) ? (v as HousingLocation) : DEFAULT_LOCATION
}

function safeNumber(s: string): number {
  const n = parseFloat((s || '').trim())
  return Number.isFinite(n) ? n : 0
}

function parseEditId(v: string | null): number | null {
  if (!v) return null
  const n = parseInt(v, 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

function getFileExtFromType(mimeType: string) {
  const t = (mimeType || '').toLowerCase()
  if (t.includes('png')) return 'png'
  if (t.includes('webp')) return 'webp'
  if (t.includes('gif')) return 'gif'
  return 'jpg'
}

function uniq(arr: string[]) {
  return Array.from(new Set(arr))
}

async function uploadLocalFilesForPost(userId: string, postId: number, localFiles: File[]): Promise<string[]> {
  if (localFiles.length === 0) return []
  const ts = Date.now()
  const urls: string[] = []
  for (let i = 0; i < localFiles.length; i++) {
    const file = localFiles[i]
    const ext = getFileExtFromType(file.type)
    const filePath = `housing/${userId}/${postId}/${ts}-${i + 1}.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('post-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || undefined,
      })
    if (uploadError) throw uploadError
    const { data: publicData } = supabase.storage.from('post-images').getPublicUrl(filePath)
    const publicUrl = publicData?.publicUrl || ''
    if (!publicUrl) throw new Error('无法获取图片公开链接')
    urls.push(publicUrl)
  }
  return urls
}

type AuthStatus = 'checking' | 'not-logged-in' | 'email-not-verified' | 'ok'

function HousingPublishClient() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const editId = useMemo(() => parseEditId(searchParams.get('edit')), [searchParams])
  const initialType = useMemo(() => normalizeType(searchParams.get('type')), [searchParams])

  const [authStatus, setAuthStatus] = useState<AuthStatus>('checking')
  const [mode, setMode] = useState<PublishMode>(initialType)

  // Optional fields
  const [title, setTitle] = useState('')
  const [location, setLocation] = useState<HousingLocation>(DEFAULT_LOCATION)
  const [price, setPrice] = useState('')
  const [roomType, setRoomType] = useState('')
  const [contactName, setContactName] = useState('')
  const [phone, setPhone] = useState('')
  const [wechat, setWechat] = useState('')
  const [description, setDescription] = useState('')

  const [checking, setChecking] = useState(true)
  const [loadingEdit, setLoadingEdit] = useState(false)
  const [editPost, setEditPost] = useState<HousingPost | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [previewImages, setPreviewImages] = useState<PreviewImage[]>([])
  const [imageTip, setImageTip] = useState('')

  const bottomErrorRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (error) {
      bottomErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [error])

  const isEditing = !!editPost

  // Revoke blob URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      previewImages.forEach((img) => {
        if (img.kind === 'local' && img.url.startsWith('blob:')) {
          URL.revokeObjectURL(img.url)
        }
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      setError('')
      setEditPost(null)

      let authedUserId: string | null = null

      try {
        const { data, error: authError } = await supabase.auth.getUser()
        const user = authError ? null : (data?.user ?? null)

        if (!user) {
          if (!cancelled) {
            setAuthStatus('not-logged-in')
            setChecking(false)
          }
          return
        }

        if (!user.email_confirmed_at) {
          if (!cancelled) {
            setAuthStatus('email-not-verified')
            setChecking(false)
          }
          return
        }

        if (!editId) {
          const permission = await assertUserCanCreateContent(supabase, user.id)
          if (!permission.allowed) {
            if (!cancelled) {
              setAuthStatus('ok')
              setError(permission.message || BANNED_ACCOUNT_MESSAGE)
              setChecking(false)
            }
            return
          }
        }

        authedUserId = user.id
        if (!cancelled) setAuthStatus('ok')
      } catch {
        if (!cancelled) {
          setAuthStatus('not-logged-in')
          setChecking(false)
        }
        return
      }

      if (!editId) {
        if (!cancelled) {
          setMode(initialType)
          setChecking(false)
        }
        return
      }

      if (!cancelled) {
        setLoadingEdit(true)
        setChecking(false)
      }

      const { data, error: fetchError } = await supabase
        .from('housing_posts')
        .select('*')
        .eq('id', editId)
        .single()

      if (cancelled) return

      if (fetchError || !data) {
        setError('信息不存在或已被删除')
        setLoadingEdit(false)
        return
      }

      if (data.user_id !== authedUserId) {
        setError('无权限编辑该信息')
        setLoadingEdit(false)
        return
      }

      // Prefill form fields
      setMode(normalizeType(data.type))
      setTitle(data.title || '')
      setLocation(normalizeLocation(data.location))
      setPrice(data.price > 0 ? String(data.price) : '')
      setRoomType(data.room_type === '-' ? '' : (data.room_type || ''))
      setContactName(data.contact_name || '')
      setPhone(data.phone || '')
      setWechat(data.wechat || '')
      setDescription(data.description || '')
      setPreviewImages(
        (Array.isArray(data.images) ? (data.images as string[]).filter(Boolean) : [])
          .slice(0, 3)
          .map((url) => ({ kind: 'remote' as const, url }))
      )

      setEditPost(data as HousingPost)
      setLoadingEdit(false)
    }

    run()

    return () => {
      cancelled = true
    }
  }, [router, editId, initialType])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const content = description.trim()
    if (!content) {
      setError('请填写信息内容')
      return
    }

    const contactCheck = validateContactFields(phone, wechat)
    if (!contactCheck.ok) {
      setError(contactCheck.message ?? '')
      return
    }

    setLoading(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.push('/auth/login')
      return
    }

    const permission = isEditing
      ? await assertUserCanEditOwnContent(supabase, user.id)
      : await assertUserCanCreateContent(supabase, user.id)
    if (!permission.allowed) {
      setError(permission.message || BANNED_ACCOUNT_MESSAGE)
      setLoading(false)
      return
    }

    const remoteUrls = previewImages.filter((img) => img.kind === 'remote').map((img) => img.url)
    const localFiles = previewImages
      .filter((img): img is { kind: 'local'; url: string; file: File } => img.kind === 'local')
      .map((img) => img.file)

    if (isEditing && editPost) {
      // Upload new local images
      let uploadedUrls: string[] = []
      if (localFiles.length > 0) {
        setImageTip('正在上传图片...')
        try {
          uploadedUrls = await uploadLocalFilesForPost(user.id, editPost.id, localFiles)
        } catch (err: unknown) {
          const message =
            err instanceof Error ? err.message : typeof err === 'string' ? err : '未知错误'
          setError(`图片上传失败：${message}`)
          setLoading(false)
          return
        } finally {
          setImageTip('')
        }
      }

      const finalImages = uniq([...remoteUrls, ...uploadedUrls]).slice(0, 3)

      const updatePayload = {
        type: mode,
        title: title.trim() || (mode === 'seeking' ? '求租' : '房屋出租'),
        description: content,
        price: safeNumber(price),
        location: location || DEFAULT_LOCATION,
        room_type: roomType.trim() || '-',
        contact: contactName.trim() || phone.trim() || wechat.trim() || '-',
        contact_name: contactName.trim() || null,
        phone: phone.trim() || null,
        wechat: wechat.trim() || null,
        images: finalImages,
        updated_at: new Date().toISOString(),
      }

      const { data: updated, error: updateError } = await supabase
        .from('housing_posts')
        .update(updatePayload)
        .eq('id', editPost.id)
        .eq('user_id', user.id)
        .select()
        .single()

      if (updateError || !updated) {
        setError('保存失败：未找到记录或无权限')
        setLoading(false)
        return
      }

      router.push('/profile/my-housing')
      return
    }

    // New post: check daily limit before inserting
    const limitResult = await checkDailyPostLimit(supabase, user.id)
    if (!limitResult.allowed) {
      setError(limitResult.message ?? '暂时无法验证发帖次数，请稍后重试。')
      setLoading(false)
      return
    }

    // New post: insert first with empty images, then upload, then update
    const payload = {
      type: mode,
      title: title.trim() || (mode === 'seeking' ? '求租' : '房屋出租'),
      description: content,
      price: safeNumber(price),
      location: location || DEFAULT_LOCATION,
      room_type: roomType.trim() || '-',
      contact: contactName.trim() || phone.trim() || wechat.trim() || '-',
      contact_name: contactName.trim() || null,
      phone: phone.trim() || null,
      wechat: wechat.trim() || null,
      images: [],
      status: 'published' as const,
      views: 0,
      user_id: user.id,
    }

    const { data: inserted, error: insertError } = await supabase
      .from('housing_posts')
      .insert(payload)
      .select()
      .single()

    if (insertError || !inserted) {
      setError(`发布失败：${insertError?.message || '未知错误'}`)
      setLoading(false)
      return
    }

    const postId = inserted.id as number

    let uploadedUrls: string[] = []
    if (localFiles.length > 0) {
      setImageTip('正在上传图片...')
      try {
        uploadedUrls = await uploadLocalFilesForPost(user.id, postId, localFiles)
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : typeof err === 'string' ? err : '未知错误'
        setError(`图片上传失败：${message}`)
        setLoading(false)
        return
      } finally {
        setImageTip('')
      }
    }

    if (uploadedUrls.length > 0) {
      const finalImages = uniq(uploadedUrls).slice(0, 3)
      const { error: updateImagesError } = await supabase
        .from('housing_posts')
        .update({ images: finalImages, updated_at: new Date().toISOString() })
        .eq('id', postId)
        .eq('user_id', user.id)
      if (updateImagesError) {
        setError(`图片保存失败：${updateImagesError.message}`)
        setLoading(false)
        return
      }
    }

    router.push('/housing')
  }

  if (authStatus === 'checking' || checking) return <div className="flex justify-center py-20 text-gray-500">验证中...</div>

  if (authStatus === 'not-logged-in') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <div className="bg-white rounded-2xl shadow-sm p-6 w-full max-w-md mx-auto text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-3">请先登录</h1>
          <p className="text-gray-600 text-sm mb-6">登录后才可以发布信息。</p>
          <Link
            href="/auth/login"
            className="inline-block bg-[#1976d2] text-white px-6 py-2.5 rounded-lg font-medium hover:bg-[#1565c0] transition"
          >
            前往登录
          </Link>
        </div>
      </div>
    )
  }

  if (authStatus === 'email-not-verified') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <div className="bg-white rounded-2xl shadow-sm p-6 w-full max-w-md mx-auto text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-3">请先完成邮箱验证</h1>
          <p className="text-gray-600 text-sm mb-6">
            为了保障平台信息安全，请先打开注册邮箱，点击 OpenAA 的邮箱确认链接后再发布信息。
          </p>
          <Link
            href="/profile"
            className="inline-block bg-[#1976d2] text-white px-6 py-2.5 rounded-lg font-medium hover:bg-[#1565c0] transition"
          >
            返回我的页面
          </Link>
        </div>
      </div>
    )
  }

  const isDailyLimitError = error.includes('今天发布的信息已达到平台限制')
  const isContactMissingError = error === CONTACT_MISSING_MESSAGE

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{editId ? '编辑房屋信息' : '发布房源'}</h1>

      {error && !isContactMissingError && (
        <div className="bg-red-50 text-red-600 rounded-lg p-3 text-sm mb-4">{error}</div>
      )}

      {loadingEdit ? (
        <div className="flex justify-center py-20 text-gray-500">加载中...</div>
      ) : error && !isContactMissingError ? null : (
        <>
          {/* Mode switch */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">发布类型</label>
            <div className="inline-flex rounded-xl bg-gray-100 p-1">
              <button
                type="button"
                onClick={() => { if (!isEditing) setMode('renting') }}
                disabled={isEditing}
                className={
                  mode === 'renting'
                    ? 'px-4 py-2 text-sm font-semibold rounded-lg bg-white text-gray-900 shadow-sm disabled:opacity-50'
                    : 'px-4 py-2 text-sm font-semibold rounded-lg text-gray-600 hover:text-gray-900 disabled:opacity-50'
                }
              >
                发布房源
              </button>
              <button
                type="button"
                onClick={() => { if (!isEditing) setMode('seeking') }}
                disabled={isEditing}
                className={
                  mode === 'seeking'
                    ? 'px-4 py-2 text-sm font-semibold rounded-lg bg-white text-gray-900 shadow-sm disabled:opacity-50'
                    : 'px-4 py-2 text-sm font-semibold rounded-lg text-gray-600 hover:text-gray-900 disabled:opacity-50'
                }
              >
                求租求购
              </button>
            </div>
            {isEditing && (
              <p className="mt-2 text-xs text-gray-400">编辑模式下不支持切换类型（出租/求租）。</p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">标题</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={mode === 'seeking' ? '不填默认：求租' : '不填默认：房屋出租'}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1976d2] focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">地区</label>
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value as HousingLocation)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1976d2] focus:border-transparent"
                >
                  {HOUSING_LOCATIONS.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-400">默认：纽约 New York</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">租金 (USD)</label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  min="0"
                  placeholder="不填默认：0（面议）"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1976d2] focus:border-transparent"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">房型</label>
                <input
                  type="text"
                  value={roomType}
                  onChange={(e) => setRoomType(e.target.value)}
                  placeholder="例：一室一厅 / 主卧 / 次卧（可不填）"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1976d2] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">联系人</label>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="请输入联系人"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1976d2] focus:border-transparent"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">联系电话</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="请输入联系电话"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1976d2] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">微信号</label>
                <input
                  type="text"
                  value={wechat}
                  onChange={(e) => setWechat(e.target.value)}
                  placeholder="请输入微信号"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1976d2] focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">信息内容 *</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                rows={7}
                placeholder={
                  mode === 'seeking'
                    ? '请描述：期望地区、预算、入住时间、人数、需求、联系方式等（可只写一段内容）'
                    : '请描述：地址/区域、租金、房型、入住时间、要求、联系方式等（可只写一段内容）'
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1976d2] focus:border-transparent resize-none"
              />
            </div>

            {/* Image upload (0~3) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">图片（可选，最多3张）</label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={async (e) => {
                  setImageTip('')
                  const files = Array.from(e.target.files || [])
                  if (files.length === 0) return

                  const remaining = Math.max(0, 3 - previewImages.length)
                  const allowed = files.slice(0, remaining)
                  if (files.length > remaining) {
                    setImageTip('最多只能上传 3 张图片（包含已有图片）。已自动截断超出部分。')
                  }
                  if (allowed.length === 0) {
                    e.currentTarget.value = ''
                    return
                  }

                  setImageTip('正在处理图片...')
                  try {
                    const compressedFiles = await Promise.all(allowed.map((file) => compressImageFile(file)))
                    setPreviewImages((prev) => {
                      const next: PreviewImage[] = [
                        ...prev,
                        ...compressedFiles.map((file) => ({
                          kind: 'local' as const,
                          url: URL.createObjectURL(file),
                          file,
                        })),
                      ]
                      return next.slice(0, 3)
                    })
                    setImageTip('')
                  } catch (err) {
                    setImageTip('')
                    setError(getCompressImageErrorMessage(err))
                  } finally {
                    // allow selecting same file again
                    e.currentTarget.value = ''
                  }
                }}
                className="w-full text-sm text-gray-600"
              />

              {imageTip && <p className="mt-1 text-xs text-amber-600">{imageTip}</p>}

              {previewImages.length > 0 && (
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {previewImages.slice(0, 3).map((img, idx) => (
                    <div key={`${img.url}-${idx}`} className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.url} alt={`preview-${idx + 1}`} className="h-24 w-full object-cover rounded-lg border" />
                      <button
                        type="button"
                        onClick={() => {
                          setPreviewImages((prev) => {
                            const target = prev[idx]
                            if (target?.kind === 'local' && target.url.startsWith('blob:')) {
                              URL.revokeObjectURL(target.url)
                            }
                            return prev.filter((_, i) => i !== idx)
                          })
                        }}
                        className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-black/70 text-white text-xs flex items-center justify-center"
                        aria-label="删除图片"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div ref={bottomErrorRef}>
              {error && (
                <div className="mb-4 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-600">
                  {error}
                  {error === CONTACT_MISSING_MESSAGE && (
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={() => setError('')}
                        className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
                      >
                        返回修改
                      </button>
                    </div>
                  )}
                </div>
              )}
              {isDailyLimitError && (
                <div className="mt-3 flex flex-wrap gap-3">
                  <Link
                    href="/profile"
                    className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-600"
                  >
                    返回我的页面
                  </Link>
                  <Link
                    href="/"
                    className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600"
                  >
                    返回首页
                  </Link>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-[#1976d2] text-white py-3 rounded-lg font-medium hover:bg-[#1565c0] transition disabled:opacity-50"
              >
                {loading ? (isEditing ? '保存中...' : '发布中...') : isEditing ? '保存修改' : '发布'}
              </button>
              <Link
                href={isEditing ? '/profile/my-housing' : '/housing'}
                className="flex-1 text-center py-3 rounded-lg font-medium text-gray-600 ring-1 ring-gray-300 bg-white hover:bg-gray-50 transition"
              >
                取消
              </Link>
            </div>
          </form>
        </>
      )}
    </div>
  )
}

export default function HousingPublishPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20 text-gray-500">加载中...</div>}>
      <HousingPublishClient />
    </Suspense>
  )
}
