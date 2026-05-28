'use client'

import { useState, useEffect } from 'react'
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
import type { ServicePost } from '@/types'

function formatDate(s: string | null) {
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

function isAdminHidden(post: ServicePost) {
  return post.status === 'hidden' && post.admin_hidden === true
}

function statusLabel(post: ServicePost) {
  if (post.status === 'deleted') return '已删除'
  if (isAdminHidden(post)) return '已被管理员下架'
  if (post.status === 'hidden' || !post.is_active) return '已隐藏'
  return '显示中'
}

function statusBadgeClass(post: ServicePost) {
  if (post.status === 'deleted') return 'bg-red-50 text-red-600 ring-1 ring-red-100'
  if (isAdminHidden(post)) return 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
  if (post.status === 'hidden' || !post.is_active) return 'bg-zinc-50 text-zinc-600 ring-1 ring-zinc-100'
  return 'bg-blue-50 text-blue-700 ring-1 ring-blue-100'
}

export default function MyServicesPage() {
  const router = useRouter()
  const [posts, setPosts] = useState<ServicePost[]>([])
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
          .from('service_posts')
          .select('*')
          .eq('user_id', user.id)
          .neq('status', 'deleted')
          .order('created_at', { ascending: false })

      setPosts(data || [])
      setLoading(false)
    }

    fetchPosts()
  }, [router])

  const handleHide = async (id: string) => {
    if (!confirm('确认隐藏此服务信息？')) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }

    const permission = await assertUserCanHideContent(supabase, user.id)
    if (!permission.allowed) {
      alert(permission.message || '账号状态暂时无法验证，请稍后重试。')
      return
    }

    const { data: updated, error } = await supabase
      .from('service_posts')
      .update({ status: 'hidden', is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error || !updated) {
      alert(`操作失败：${error?.message || '未知错误'}`)
      return
    }

    setPosts((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, status: 'hidden', is_active: false, admin_hidden: false } : p
      )
    )
  }

  const handleRestore = async (id: string) => {
    if (posts.some((post) => post.id === id && isAdminHidden(post))) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }

    const permission = await assertUserCanRestoreContent(supabase, user.id)
    if (!permission.allowed) {
      alert(permission.message || '账号状态暂时无法验证，请稍后重试。')
      return
    }

    const { data: updated, error } = await supabase
      .from('service_posts')
      .update({ status: 'active', is_active: true, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)
      .eq('status', 'hidden')
      .eq('admin_hidden', false)
      .select()
      .single()

    if (error || !updated) {
      alert(`操作失败：${error?.message || '未知错误'}`)
      return
    }

    setPosts((prev) => prev.map((p) => p.id === id ? { ...p, status: 'active', is_active: true } : p))
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确认删除此服务信息？删除后无法恢复。')) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }

    const permission = await assertUserCanDeleteOwnContent(supabase, user.id)
    if (!permission.allowed) {
      alert(permission.message || '账号状态暂时无法验证，请稍后重试。')
      return
    }

    const { data: updated, error } = await supabase
      .from('service_posts')
      .update({ status: 'deleted', is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error || !updated) {
      alert(`删除失败：${error?.message || '未知错误'}`)
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
          <h1 className="text-2xl font-bold text-gray-900">我的服务</h1>
          <p className="text-sm text-gray-500 mt-1">管理您发布的本地服务信息</p>
        </div>
        <Link
          href="/services/publish"
          className="h-10 px-4 flex items-center text-sm text-blue-600 bg-blue-50 border border-blue-100 rounded-xl hover:bg-blue-100 transition"
        >
          + 发布服务
        </Link>
      </div>

      {posts.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
          <div className="text-4xl mb-3">🛠️</div>
          <p className="text-gray-700 font-medium">你还没有发布服务信息</p>
          <Link
            href="/services/publish"
            className="inline-flex mt-4 bg-[#1976d2] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#1565c0] transition"
          >
            立即发布
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <div key={post.id} className="rounded-2xl border border-gray-100 bg-white shadow-sm p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-900 truncate max-w-[240px] sm:max-w-[480px]">
                      {post.title}
                    </h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusBadgeClass(post)}`}>
                      {statusLabel(post)}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-50 text-zinc-600 ring-1 ring-zinc-100">
                      {post.category}
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-gray-600 flex flex-wrap gap-x-4 gap-y-1">
                    {post.location ? <span>📍 {post.location}</span> : null}
                    <span>🕒 {formatDate(post.created_at)}</span>
                  </div>
                </div>
              </div>

              {isAdminHidden(post) ? (
                <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  该内容已被管理员下架，暂时不会在公开页面展示。你可以修改后重新提交，或删除该内容。
                </div>
              ) : null}

              <div className="mt-4 flex items-center gap-2 flex-wrap">
                {post.status === 'active' && post.is_active ? (
                  <Link
                    href={`/services/${post.id}`}
                    className="px-3 py-2 rounded-lg text-sm text-zinc-800 ring-1 ring-zinc-300 bg-white hover:bg-zinc-50 transition"
                  >
                    查看
                  </Link>
                ) : null}
                <Link
                  href={`/services/edit/${post.id}`}
                  className="px-3 py-2 rounded-lg text-sm text-zinc-800 ring-1 ring-zinc-300 bg-white hover:bg-zinc-50 transition"
                >
                  编辑
                </Link>
                {(post.status === 'active' && post.is_active) ? (
                  <button
                    onClick={() => handleHide(post.id)}
                    className="px-3 py-2 rounded-lg text-sm text-amber-700 ring-1 ring-amber-200 bg-amber-50 hover:bg-amber-100 transition"
                  >
                    隐藏
                  </button>
                ) : !isAdminHidden(post) && (post.status === 'hidden' || !post.is_active) ? (
                  <button
                    onClick={() => handleRestore(post.id)}
                    className="px-3 py-2 rounded-lg text-sm text-emerald-700 ring-1 ring-emerald-200 bg-emerald-50 hover:bg-emerald-100 transition"
                  >
                    恢复显示
                  </button>
                ) : null}
                <button
                  onClick={() => handleDelete(post.id)}
                  className="px-3 py-2 rounded-lg text-sm text-red-600 ring-1 ring-red-200 bg-red-50 hover:bg-red-100 transition"
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <BackToTopButton />
    </div>
  )
}
