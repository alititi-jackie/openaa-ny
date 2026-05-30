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
import type { SecondhandItem } from '@/types'

type ItemWithOptionalLocation = SecondhandItem & {
  location?: string | null
}

function getItemLocation(item: SecondhandItem): string {
  const location = (item as ItemWithOptionalLocation).location
  return typeof location === 'string' ? location.trim() : ''
}

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
  return t === 'buying' ? '求购' : '出售'
}

function typeBadgeClass(t?: string) {
  return t === 'buying'
    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'
    : 'bg-amber-50 text-amber-700 ring-1 ring-amber-100'
}

function displayPrice(item: SecondhandItem) {
  const price = Number(item.price || 0)
  if (!Number.isFinite(price) || price <= 0) return '价格面议'
  return `$${price}`
}

function normalizeTag(value: string | null | undefined): string | null {
  const text = (value || '').trim()
  if (!text || text === '-' || text === '\u2014') return null
  return text
}

function isAdminHidden(item: SecondhandItem) {
  return item.status === 'hidden' && item.admin_hidden === true
}

function statusLabel(item: SecondhandItem) {
  if (item.status === 'deleted') return '已删除'
  if (isAdminHidden(item)) return '已被管理员下架'
  if (item.status === 'hidden') return '已隐藏'
  return '显示中'
}

function statusBadgeClass(item: SecondhandItem) {
  if (item.status === 'deleted') return 'bg-red-50 text-red-600 ring-1 ring-red-100'
  if (isAdminHidden(item)) return 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
  if (item.status === 'hidden') return 'bg-zinc-50 text-zinc-600 ring-1 ring-zinc-100'
  return 'bg-blue-50 text-blue-700 ring-1 ring-blue-100'
}

export default function MyItemsPage() {
  const router = useRouter()
  const [items, setItems] = useState<SecondhandItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchItems = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      const { data } = await supabase
          .from('secondhand_items')
          .select('*')
          .eq('user_id', user.id)
          .neq('status', 'deleted')
          .order('created_at', { ascending: false })

      setItems(data || [])
      setLoading(false)
    }
    fetchItems()
  }, [router])

  const handleHide = async (id: number) => {
    if (!confirm('确认隐藏此商品？')) return

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
      .from('secondhand_items')
      .update({ status: 'hidden', updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      alert(`操作失败：${error.message}`)
      return
    }

    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: 'hidden', admin_hidden: false } : item))
    )
  }

  const handleRestore = async (id: number) => {
    if (items.some((item) => item.id === id && isAdminHidden(item))) return

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
      .from('secondhand_items')
      .update({ status: 'published', updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)
      .eq('status', 'hidden')
      .eq('admin_hidden', false)

    if (error) {
      alert(`操作失败：${error.message}`)
      return
    }

    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, status: 'published' } : item)))
  }

  const handleDelete = async (id: number) => {
    if (!confirm('确认删除此商品？')) return

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
      .from('secondhand_items')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      alert(`删除失败：${error.message}`)
      return
    }

    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  if (loading) return <div className="flex justify-center py-20 text-gray-500">加载中...</div>

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-24">
      <DetailBackButton fallbackHref="/profile" />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">我的商品</h1>
          <p className="text-sm text-gray-500 mt-1">管理您发布的二手出售与求购信息</p>
        </div>
        <Link
          href="/secondhand/publish"
          className="h-10 shrink-0 whitespace-nowrap px-4 flex items-center text-sm text-blue-600 bg-blue-50 border border-blue-100 rounded-xl hover:bg-blue-100 transition"
        >
          + 发布商品
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
          <div className="text-4xl mb-3">🛍️</div>
          <p className="text-gray-700 font-medium">你还没有发布商品</p>
          <Link
            href="/secondhand/publish"
            className="inline-flex mt-4 bg-[#1976d2] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#1565c0] transition"
          >
            立即发布
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const loc = getItemLocation(item)
            const category = normalizeTag(item.category)

            return (
              <div
                key={item.id}
                className="rounded-2xl border border-gray-100 bg-white shadow-sm p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900 line-clamp-2">
                        {item.title}
                      </h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusBadgeClass(item)}`}>
                        {statusLabel(item)}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${typeBadgeClass(item.type)}`}
                      >
                        {typeLabel(item.type)}
                      </span>
                      {category ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-50 text-zinc-600 ring-1 ring-zinc-100">
                          {category}
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-2 text-sm text-gray-600 flex flex-wrap gap-x-4 gap-y-1">
                      <span>💰 {displayPrice(item)}</span>
                      {loc ? <span>📍 {loc}</span> : null}
                      <span>🕒 {formatDate(item.created_at)}</span>
                    </div>
                  </div>
                </div>

                {isAdminHidden(item) ? (
                  <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    该内容已被管理员下架，暂时不会在公开页面展示。你可以修改后重新提交，或删除该内容。
                  </div>
                ) : null}

                <div className="mt-4 flex items-center gap-2 flex-wrap">
                  {item.status === 'published' ? (
                    <Link
                      href={`/secondhand/${item.id}`}
                      className="px-3 py-2 rounded-lg text-sm text-zinc-800 ring-1 ring-zinc-300 bg-white hover:bg-zinc-50 transition"
                    >
                      查看
                    </Link>
                  ) : null}
                  <Link
                    href={`/secondhand/edit/${item.id}`}
                    className="px-3 py-2 rounded-lg text-sm text-zinc-800 ring-1 ring-zinc-300 bg-white hover:bg-zinc-50 transition"
                  >
                    编辑
                  </Link>
                  {item.status === 'published' ? (
                    <button
                      onClick={() => handleHide(item.id)}
                      className="px-3 py-2 rounded-lg text-sm text-amber-700 ring-1 ring-amber-200 bg-amber-50 hover:bg-amber-100 transition"
                    >
                      隐藏
                    </button>
                  ) : item.status === 'hidden' && !isAdminHidden(item) ? (
                    <button
                      onClick={() => handleRestore(item.id)}
                      className="px-3 py-2 rounded-lg text-sm text-emerald-700 ring-1 ring-emerald-200 bg-emerald-50 hover:bg-emerald-100 transition"
                    >
                      恢复显示
                    </button>
                  ) : null}
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="px-3 py-2 rounded-lg text-sm text-red-600 ring-1 ring-red-200 bg-red-50 hover:bg-red-100 transition"
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
