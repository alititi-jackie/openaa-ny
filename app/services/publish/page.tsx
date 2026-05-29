'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { assertUserCanCreateContent, BANNED_ACCOUNT_MESSAGE } from '@/lib/accountStatus'
import { checkDailyPostLimit } from '@/lib/checkDailyPostLimit'
import { DEFAULT_LOCATION, LOCATION_OPTIONS } from '@/lib/locationOptions'
import { compressImageFile, getCompressImageErrorMessage } from '@/lib/compressImage'
import { validateContactFields, CONTACT_MISSING_MESSAGE } from '@/lib/contactValidation'

type PreviewImage =
  | { kind: 'remote'; url: string }
  | { kind: 'local'; url: string; file: File }

type AuthStatus = 'checking' | 'not-logged-in' | 'email-not-verified' | 'ok'

const SERVICE_CATEGORIES_PUBLISH = [
  '装修维修',
  '搬家运输',
  '家政清洁',
  '汽车相关',
  '专业服务',
  '电脑手机',
  '餐饮商业',
  '其它服务',
] as const

const SERVICE_LOCATIONS_PUBLISH = LOCATION_OPTIONS

function getFileExtFromType(mimeType: string) {
  const t = (mimeType || '').toLowerCase()
  if (t.includes('png')) return 'png'
  if (t.includes('webp')) return 'webp'
  if (t.includes('gif')) return 'gif'
  return 'jpg'
}

async function uploadLocalFilesForPost(
  userId: string,
  postId: string,
  localFiles: File[]
): Promise<string[]> {
  if (localFiles.length === 0) return []
  const ts = Date.now()
  const urls: string[] = []
  for (let i = 0; i < localFiles.length; i++) {
    const file = localFiles[i]
    const ext = getFileExtFromType(file.type)
    const filePath = `services/${userId}/${postId}/${ts}-${i + 1}.${ext}`
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

function ServicesPublishClient() {
  const router = useRouter()

  const [authStatus, setAuthStatus] = useState<AuthStatus>('checking')
  const [checking, setChecking] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<string>(SERVICE_CATEGORIES_PUBLISH[0])
  const [location, setLocation] = useState<string>(DEFAULT_LOCATION)
  const [description, setDescription] = useState('')
  const [contactName, setContactName] = useState('')
  const [phone, setPhone] = useState('')
  const [wechat, setWechat] = useState('')
  const [priceNote, setPriceNote] = useState('')
  const [previewImages, setPreviewImages] = useState<PreviewImage[]>([])
  const [imageTip, setImageTip] = useState('')

  const bottomErrorRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (error) {
      bottomErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [error])

  // Revoke blob URLs on unmount
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
      try {
        const { data, error: authError } = await supabase.auth.getUser()
        const user = authError ? null : (data?.user ?? null)
        if (!user) {
          if (!cancelled) { setAuthStatus('not-logged-in'); setChecking(false) }
          return
        }
        if (!user.email_confirmed_at) {
          if (!cancelled) { setAuthStatus('email-not-verified'); setChecking(false) }
          return
        }
        const permission = await assertUserCanCreateContent(supabase, user.id)
        if (!permission.allowed) {
          if (!cancelled) {
            setAuthStatus('ok')
            setError(permission.message || BANNED_ACCOUNT_MESSAGE)
            setChecking(false)
          }
          return
        }
        if (!cancelled) { setAuthStatus('ok'); setChecking(false) }
      } catch {
        if (!cancelled) { setAuthStatus('not-logged-in'); setChecking(false) }
      }
    }
    run()
    return () => { cancelled = true }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!title.trim()) { setError('请填写服务标题'); return }
    if (!category) { setError('请选择服务分类'); return }
    if (!location) { setError('请选择服务地区'); return }
    if (!description.trim()) { setError('请填写服务介绍'); return }
    const contactCheck = validateContactFields(phone, wechat)
    if (!contactCheck.ok) {
      setError(contactCheck.message ?? '')
      return
    }

    setLoading(true)

    const { data: authData } = await supabase.auth.getUser()
    const user = authData?.user
    if (!user) {
      router.push('/auth/login')
      return
    }

    const permission = await assertUserCanCreateContent(supabase, user.id)
    if (!permission.allowed) {
      setError(permission.message || BANNED_ACCOUNT_MESSAGE)
      setLoading(false)
      return
    }

    // Check daily limit
    const limitResult = await checkDailyPostLimit(supabase, user.id)
    if (!limitResult.allowed) {
      setError(limitResult.message ?? '暂时无法验证发帖次数，请稍后重试。')
      setLoading(false)
      return
    }

    // 1. Insert with empty images
    const { data: inserted, error: insertError } = await supabase
      .from('service_posts')
      .insert({
        user_id: user.id,
        title: title.trim(),
        category,
        location,
        description: description.trim(),
        contact_name: contactName.trim() || null,
        phone: phone.trim() || null,
        wechat: wechat.trim() || null,
        price_note: priceNote.trim() || null,
        images: [],
        status: 'active',
        is_active: true,
      })
      .select()
      .single()

    if (insertError || !inserted) {
      setError(`发布失败：${insertError?.message || '未知错误'}`)
      setLoading(false)
      return
    }

    const postId = inserted.id as string

    // 2. Upload images
    const localFiles = previewImages
      .filter((img): img is { kind: 'local'; url: string; file: File } => img.kind === 'local')
      .map((img) => img.file)

    if (localFiles.length > 0) {
      let uploadedUrls: string[] = []
      setImageTip('正在上传图片...')
      try {
        uploadedUrls = await uploadLocalFilesForPost(user.id, postId, localFiles)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : typeof err === 'string' ? err : '未知错误'
        setError(`图片上传失败：${message}`)
        setLoading(false)
        return
      } finally {
        setImageTip('')
      }

      // 3. Update images
      const { data: updated, error: updateError } = await supabase
        .from('service_posts')
        .update({ images: uploadedUrls, updated_at: new Date().toISOString() })
        .eq('id', postId)
        .eq('user_id', user.id)
        .select()
        .single()

      if (updateError || !updated) {
        setError(`图片保存失败：${updateError?.message || '未知错误'}`)
        setLoading(false)
        return
      }
    }

    router.push(`/services/${postId}`)
  }

  if (authStatus === 'checking' || checking) {
    return <div className="flex justify-center py-20 text-gray-500">验证中...</div>
  }

  if (authStatus === 'not-logged-in') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <div className="bg-white rounded-2xl shadow-sm p-6 w-full max-w-md mx-auto text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-3">请先登录</h1>
          <p className="text-gray-600 text-sm mb-6">登录后才可以发布服务信息。</p>
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
    <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">发布服务</h1>

      {error && !isContactMissingError && <div className="bg-red-50 text-red-600 rounded-lg p-3 text-sm mb-4">{error}</div>}

      {(!error || isContactMissingError) ? (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            服务标题 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例：专业水电维修，上门服务"
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1976d2] focus:border-transparent"
          />
        </div>

        {/* Category & Location */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              服务分类 <span className="text-red-500">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1976d2] focus:border-transparent"
            >
              {SERVICE_CATEGORIES_PUBLISH.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              服务地区 <span className="text-red-500">*</span>
            </label>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1976d2] focus:border-transparent"
            >
              {SERVICE_LOCATIONS_PUBLISH.map((loc) => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            服务介绍 <span className="text-red-500">*</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            placeholder="请详细描述您的服务内容、经验、上门范围等信息..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1976d2] focus:border-transparent resize-none"
          />
        </div>

        {/* Contact */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">联系人</label>
          <input
            type="text"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            placeholder="您的姓名或称呼"
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1976d2] focus:border-transparent"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              联系电话 <span className="text-gray-400 font-normal text-xs">（与微信至少填一项）</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="例：718-123-4567"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1976d2] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              微信号 <span className="text-gray-400 font-normal text-xs">（与电话至少填一项）</span>
            </label>
            <input
              type="text"
              value={wechat}
              onChange={(e) => setWechat(e.target.value)}
              placeholder="您的微信号"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1976d2] focus:border-transparent"
            />
          </div>
        </div>

        {/* Price note */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">价格说明（可选）</label>
          <input
            type="text"
            value={priceNote}
            onChange={(e) => setPriceNote(e.target.value)}
            placeholder="例：电话咨询 / 时薪 $30 起 / 按项目报价"
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1976d2] focus:border-transparent"
          />
        </div>

        {/* Images */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">图片（可选，最多 3 张）</label>
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
                  <img
                    src={img.url}
                    alt={`preview-${idx + 1}`}
                    className="h-24 w-full object-cover rounded-lg border"
                  />
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

        {/* Error */}
        <div ref={bottomErrorRef}>
          {error && (
            <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-600">
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
            {loading ? '发布中...' : '发布服务'}
          </button>
          <Link
            href="/services"
            className="flex-1 text-center py-3 rounded-lg font-medium text-gray-600 ring-1 ring-gray-300 bg-white hover:bg-gray-50 transition"
          >
            取消
          </Link>
        </div>
        </form>
      ) : null}
    </div>
  )
}

export default function ServicesPublishPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20 text-gray-500">加载中...</div>}>
      <ServicesPublishClient />
    </Suspense>
  )
}
