'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import {
  assertUserCanDeleteOwnContent,
  assertUserCanHideContent,
  assertUserCanRestoreContent,
} from '@/lib/accountStatus'
import BackToTopButton from '@/components/BackToTopButton'
import DetailBackButton from '@/components/DetailBackButton'
import type { HousingPost } from '@/types'

function formatDate(s: string) {
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

function typeLabel(t?: string) {
  return t === 'seeking' ? '求租' : '出租'
}

function typeBadgeClass(t?: string) {
  return t === 'seeking'
    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'
    : 'bg-blue-50 text-blue-700 ring-1 ring-blue-100'
}

function displayPrice(p: number): string | null {
  const price = Number(p || 0)
  if (!Number.isFinite(price) || price <= 0) return null
  return `$${price}`
}

function isAdminHidden(post: HousingPost) {
  return post.status === 'hidden' && post.admin_hidden === true
}

export default function MyHousingPage() {
  const router = useRouter()
  const [posts, setPosts] = useState<HousingPost[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPosts = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/auth/login')
        return
      }

      const { data } = await supabase
          .from('housing_posts')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

      setPosts(data || [])
      setLoading(false)
    }

    fetchPosts()
  }, [router])

  const handleHide = async (id: number) => {
    if (!confirm('确认隐藏此房屋信息？')) return

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.push('/auth/login')
      return
    }

    const permission = await assertUserCanHideContent(supabase, user.id)
    if (!permission.allowed) {
      alert(permission.message || '账号状态暂时无法验证，请稍后重试。')
      return
    }

    const { error } = await supabase
      .from('housing_posts')
      .update({ status: 'hidden', updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      alert(`操作失败：${error.message}`)
      return
    }

    setPosts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: 'hidden', admin_hidden: false } : p))
    )
  }

  const handleRestore = async (id: number) => {
    if (posts.some((p) => p.id === id && isAdminHidden(p))) return

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.push('/auth/login')
      return
    }

    const permission = await assertUserCanRestoreContent(supabase, user.id)
    if (!permission.allowed) {
      alert(permission.message || '账号状态暂时无法验证，请稍后重试。')
      return
    }

    const { error } = await supabase
      .from('housing_posts')
      .update({ status: 'published', updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)
      .eq('status', 'hidden')
      .eq('admin_hidden', false)

    if (error) {
      alert(`操作失败：${error.message}`)
      return
    }

    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, status: 'published' } : p)))
  }

  const handleDelete = async (id: number) => {
    if (!confirm('确认删除此房屋信息？')) return

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.push('/auth/login')
      return
    }

    const permission = await assertUserCanDeleteOwnContent(supabase, user.id)
    if (!permission.allowed) {
      alert(permission.message || '账号状态暂时无法验证，请稍后重试。')
      return
    }

    const { error } = await supabase
      .from('housing_posts')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      alert(`删除失败：${error.message}`)
      return
    }

    setPosts((prev) => prev.filter((p) => p.id !== id))
  }

  if (loading) return <div className="flex justify-center py-20 text-gray-500">加载中...</div>

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <DetailBackButton fallbackHref="/profile" />
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">我的房屋</h1>
          <p className="text-sm text-gray-500 mt-1">管理您发布的房屋出租与求租信息</p>
        </div>
        <Link
          href="/housing/publish"
          className="h-10 px-4 flex items-center text-sm text-blue-600 bg-blue-50 border border-blue-100 rounded-xl hover:bg-blue-100 transition"
        >
          + 发布房源
        </Link>
      </div>

      {posts.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
          <div className="text-4xl mb-3">🏠</div>
          <p className="text-gray-700 font-medium">你还没有发布房屋信息</p>
          <Link
            href="/housing/publish"
            className="inline-flex mt-4 bg-[#1976d2] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#1565c0] transition"
          >
            立即发布
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((p) => {
            const priceStr = displayPrice(p.price)
            return (
              <div key={p.id} className="rounded-2xl border border-gray-100 bg-white shadow-sm p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900 truncate max-w-[260px] sm:max-w-[520px]">
                        {p.title || (p.type === 'seeking' ? '求租' : '房屋出租')}
                      </h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${typeBadgeClass(p.type)}`}>
                        {typeLabel(p.type)}
                      </span>
                      {p.room_type ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-50 text-zinc-600 ring-1 ring-zinc-100">
                          {p.room_type}
                        </span>
                      ) : null}
                      {isAdminHidden(p) ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-200">
                          已被管理员下架
                        </span>
                      ) : p.status === 'hidden' ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-50 text-zinc-600 ring-1 ring-zinc-100">
                          已隐藏
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-2 text-sm text-gray-600 flex flex-wrap gap-x-4 gap-y-1">
                      {priceStr ? <span>💰 {priceStr}</span> : null}
                      {p.location ? <span>📍 {p.location}</span> : null}
                      <span>🕒 {formatDate(p.created_at)}</span>
                    </div>
                  </div>
                </div>

                {isAdminHidden(p) ? (
                  <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    该内容已被管理员下架，暂时不会在公开页面展示。你可以修改后重新提交，或删除该内容。
                  </div>
                ) : null}

                <div className="mt-4 flex items-center gap-2">
                  <Link
                    href={`/housing/edit/${p.id}`}
                    className="flex-1 text-center px-3 py-2 rounded-lg text-sm text-zinc-800 ring-1 ring-zinc-300 bg-white hover:bg-zinc-50 transition"
                  >
                    编辑
                  </Link>
                  {p.status === 'published' ? (
                    <button
                      onClick={() => handleHide(p.id)}
                      className="flex-1 text-center px-3 py-2 rounded-lg text-sm text-amber-700 ring-1 ring-amber-200 bg-amber-50 hover:bg-amber-100 transition"
                    >
                      隐藏
                    </button>
                  ) : p.status === 'hidden' && !isAdminHidden(p) ? (
                    <button
                      onClick={() => handleRestore(p.id)}
                      className="flex-1 text-center px-3 py-2 rounded-lg text-sm text-emerald-700 ring-1 ring-emerald-200 bg-emerald-50 hover:bg-emerald-100 transition"
                    >
                      恢复显示
                    </button>
                  ) : null}
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="flex-1 text-center px-3 py-2 rounded-lg text-sm text-red-600 ring-1 ring-red-200 bg-red-50 hover:bg-red-100 transition"
                  >
                    删除
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
      <BackToTopButton />
    </div>
  )
}
