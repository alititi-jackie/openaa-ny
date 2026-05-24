'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { use } from 'react'
import { supabase } from '@/lib/supabase'
import { assertUserCanEditOwnContent } from '@/lib/accountStatus'
import { DEFAULT_LOCATION, LOCATION_OPTIONS } from '@/lib/locationOptions'
import { compressImageFile, getCompressImageErrorMessage } from '@/lib/compressImage'
import { validateContactFields } from '@/lib/contactValidation'
import type { ServicePost } from '@/types'

type PreviewImage =
  | { kind: 'remote'; url: string }
  | { kind: 'local'; url: string; file: File }

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

function uniq(arr: string[]) {
  return Array.from(new Set(arr))
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

export default function ServiceEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [post, setPost] = useState<ServicePost | null>(null)

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
      const { data: authData } = await supabase.auth.getUser()
      const user = authData?.user
      if (!user) {
        router.push('/auth/login')
        return
      }

      const { data, error: fetchError } = await supabase
        .from('service_posts')
        .select('*')
        .eq('id', id)
        .single()

      if (cancelled) return

      if (fetchError || !data) {
        setError('信息不存在或已被删除')
        setLoading(false)
        return
      }

      if (data.user_id !== user.id) {
        setError('无权限编辑该信息')
        setLoading(false)
        return
      }

      const p = data as ServicePost
      setPost(p)
      setTitle(p.title)
      setCategory(p.category)
      setLocation(
        SERVICE_LOCATIONS_PUBLISH.includes(p.location as (typeof SERVICE_LOCATIONS_PUBLISH)[number])
          ? p.location
          : DEFAULT_LOCATION
      )
      setDescription(p.description)
      setContactName(p.contact_name || '')
      setPhone(p.phone || '')
      setWechat(p.wechat || '')
      setPriceNote(p.price_note || '')
      setPreviewImages(
        (Array.isArray(p.images) ? (p.images as string[]).filter(Boolean) : [])
          .slice(0, 3)
          .map((url) => ({ kind: 'remote' as const, url }))
      )
      setLoading(false)
    }
    run()
    return () => { cancelled = true }
  }, [id, router])

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

    setSaving(true)

    const { data: authData } = await supabase.auth.getUser()
    const user = authData?.user
    if (!user || !post) {
      router.push('/auth/login')
      return
    }

    const permission = await assertUserCanEditOwnContent(supabase, user.id)
    if (!permission.allowed) {
      setError(permission.message || '账号状态暂时无法验证，请稍后重试。')
      setSaving(false)
      return
    }

    // Upload new local images
    const remoteUrls = previewImages.filter((img) => img.kind === 'remote').map((img) => img.url)
    const localFiles = previewImages
      .filter((img): img is { kind: 'local'; url: string; file: File } => img.kind === 'local')
      .map((img) => img.file)

    let uploadedUrls: string[] = []
    if (localFiles.length > 0) {
      setImageTip('正在上传图片...')
      try {
        uploadedUrls = await uploadLocalFilesForPost(user.id, post.id, localFiles)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : typeof err === 'string' ? err : '未知错误'
        setError(`图片上传失败：${message}`)
        setSaving(false)
        return
      } finally {
        setImageTip('')
      }
    }

    const finalImages = uniq([...remoteUrls, ...uploadedUrls]).slice(0, 3)

    const { data: updated, error: updateError } = await supabase
      .from('service_posts')
      .update({
        title: title.trim(),
        category,
        location,
        description: description.trim(),
        contact_name: contactName.trim() || null,
        phone: phone.trim() || null,
        wechat: wechat.trim() || null,
        price_note: priceNote.trim() || null,
        images: finalImages,
        updated_at: new Date().toISOString(),
      })
      .eq('id', post.id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateError || !updated) {
      setError('保存失败：未找到记录或无权限')
      setSaving(false)
      return
    }

    router.push('/profile/my-services')
  }

  if (loading) return <div className="flex justify-center py-20 text-gray-500">加载中...</div>

  if (error && !post) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4 py-20 text-center">
        <p className="text-red-600 font-medium mb-4">{error}</p>
        <Link href="/profile/my-services" className="text-[#1976d2] text-sm hover:underline">
          ← 返回我的服务
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">编辑服务信息</h1>

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
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1976d2] focus:border-transparent"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              联系电话
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1976d2] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              微信号
            </label>
            <input
              type="text"
              value={wechat}
              onChange={(e) => setWechat(e.target.value)}
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
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1976d2] focus:border-transparent"
          />
        </div>

        {/* Images */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">图片（最多 3 张）</label>
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
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 bg-[#1976d2] text-white py-3 rounded-lg font-medium hover:bg-[#1565c0] transition disabled:opacity-50"
          >
            {saving ? '保存中...' : '保存修改'}
          </button>
          <Link
            href="/profile/my-services"
            className="flex-1 text-center py-3 rounded-lg font-medium text-gray-600 ring-1 ring-gray-300 bg-white hover:bg-gray-50 transition"
          >
            取消
          </Link>
        </div>
      </form>
    </div>
  )
}
