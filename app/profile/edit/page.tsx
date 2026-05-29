'use client'

import { useRef, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { compressImageFile, getCompressImageErrorMessage } from '@/lib/compressImage'
import { deleteImage, uploadImage } from '@/lib/storage'
import { getPublicStorageObjectPath, isOwnAvatarObjectPath } from '@/lib/avatar'

const AVATAR_BUCKET = 'avatars'
const AVATAR_MAX_SIZE_BYTES = 8 * 1024 * 1024
const AVATAR_ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

export default function EditProfilePage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [form, setForm] = useState({ username: '', bio: '', phone: '' })
  const [avatarUrl, setAvatarUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [avatarMessage, setAvatarMessage] = useState('')

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const { data } = await supabase.from('users').select('*').eq('id', user.id).single()
      if (data) {
        setForm({ username: data.username || '', bio: data.bio || '', phone: data.phone || '' })
        setAvatarUrl(data.avatar_url || '')
      }
      setLoading(false)
    }
    fetchProfile()
  }, [router])

  const handleAvatarFile = async (file: File | null) => {
    setAvatarMessage('')
    setError('')
    if (!file) return

    if (!AVATAR_ALLOWED_TYPES.has(file.type)) {
      setError('头像格式仅支持 JPG、PNG、WEBP')
      return
    }

    if (file.size > AVATAR_MAX_SIZE_BYTES) {
      setError('头像图片不能超过 8MB')
      return
    }

    setAvatarUploading(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setAvatarUploading(false)
      router.push('/auth/login')
      return
    }

    try {
      const compressed = await compressImageFile(file, {
        maxWidth: 512,
        maxHeight: 512,
        quality: 0.82,
        outputType: 'image/jpeg',
      })
      const previousAvatarUrl = avatarUrl
      const { url, error: uploadError } = await uploadImage(compressed, AVATAR_BUCKET, user.id)

      if (uploadError || !url) {
        setError(uploadError?.message || '头像上传失败')
        return
      }

      const { data: updated, error: updateError } = await supabase
        .from('users')
        .update({
          avatar_url: url,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
        .select('avatar_url')
        .single()

      if (updateError || !updated?.avatar_url) {
        setError('头像保存失败，请稍后重试')
        return
      }

      setAvatarUrl(updated.avatar_url)
      setAvatarMessage('头像已更新')
      router.refresh()

      const oldObjectPath = getPublicStorageObjectPath(previousAvatarUrl, AVATAR_BUCKET)
      if (isOwnAvatarObjectPath(oldObjectPath, user.id)) {
        await deleteImage(AVATAR_BUCKET, oldObjectPath)
      }
    } catch (uploadError) {
      setError(getCompressImageErrorMessage(uploadError))
    } finally {
      setAvatarUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess(false)

    const username = form.username.trim()
    const bio = form.bio.trim()
    const phone = form.phone.trim()

    if (username.length < 4) {
      setError('昵称至少需要 4 个字符')
      setSaving(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setSaving(false)
      router.push('/auth/login')
      return
    }

    const { error: updateError } = await supabase
      .from('users')
      .update({
        username,
        bio,
        phone,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select('username, bio, phone')
      .single()

    if (updateError) {
      setError('保存失败：未找到记录或无权限')
      setSaving(false)
      return
    }

    const { data: latestProfile, error: reloadError } = await supabase
      .from('users')
      .select('username, bio, phone')
      .eq('id', user.id)
      .single()

    if (reloadError || !latestProfile) {
      setError('资料已提交，但读取最新资料失败，请刷新后再查看。')
      setSaving(false)
      return
    }

    setForm({
      username: latestProfile.username || '',
      bio: latestProfile.bio || '',
      phone: latestProfile.phone || '',
    })

    setSaving(false)
    setSuccess(true)
    setTimeout(() => { setSuccess(false); router.push('/profile') }, 1500)
  }

  if (loading) return <div className="flex justify-center py-20 text-gray-500">加载中...</div>

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">编辑资料</h1>
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
        {success && (
          <div className="bg-green-50 text-green-600 rounded-lg p-3 text-sm">✅ 保存成功！</div>
        )}
        {error && (
          <div className="bg-red-50 text-red-600 rounded-lg p-3 text-sm">{error}</div>
        )}
        <div className="flex flex-col items-center rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-4 text-center">
          <div className="mb-3 h-20 w-20 overflow-hidden rounded-full bg-[#1976d2] text-white">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt={form.username || '用户头像'} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-2xl font-bold">
                {form.username?.[0]?.toUpperCase() ?? '?'}
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(event) => void handleAvatarFile(event.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={avatarUploading || saving}
            className="rounded-lg border border-blue-100 bg-white px-4 py-2 text-sm font-medium text-[#1976d2] shadow-sm transition hover:bg-blue-50 disabled:opacity-50"
          >
            {avatarUploading ? '上传中...' : avatarUrl ? '更换头像' : '上传头像'}
          </button>
          <p className="mt-2 text-xs text-zinc-500">支持 JPG / PNG / WEBP，上传前会自动压缩</p>
          {avatarMessage ? <p className="mt-2 text-xs text-emerald-600">{avatarMessage}</p> : null}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">用户名</label>
          <input
            type="text"
            value={form.username}
            onChange={e => setForm(prev => ({ ...prev, username: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1976d2] focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">个人简介</label>
          <textarea
            value={form.bio}
            onChange={e => setForm(prev => ({ ...prev, bio: e.target.value }))}
            rows={3}
            placeholder="介绍一下自己..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1976d2] focus:border-transparent resize-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">联系电话</label>
          <input
            type="tel"
            value={form.phone}
            onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))}
            placeholder="xxx-xxx-xxxx"
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1976d2] focus:border-transparent"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="w-full bg-[#1976d2] text-white py-2.5 rounded-lg font-medium hover:bg-[#1565c0] transition disabled:opacity-50"
        >
          {saving ? '保存中...' : '保存更改'}
        </button>
      </form>

      <div className="mt-4 text-center">
        <Link
          href="/profile/change-password"
          className="text-[13px] text-zinc-500 hover:text-zinc-700 transition"
        >
          修改密码
        </Link>
      </div>
    </div>
  )
}
