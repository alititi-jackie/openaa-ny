'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { clearAdminToken, getAdminToken, setAdminToken } from '@/lib/adminToken'
import BackToTopButton from '@/components/BackToTopButton'

type AdminEntry = {
  id: string
  icon: string
  title: string
  description: string
  status: '已可用' | '待开发'
  href?: string
}

const ADMIN_ENTRIES: AdminEntry[] = [
  {
    id: 'feedback',
    icon: '🛎️',
    title: '反馈与举报',
    description: '查看用户反馈、举报、新闻线索和问题建议。',
    status: '已可用',
    href: '/admin/feedback',
  },
  {
    id: 'news',
    icon: '📰',
    title: '新闻管理',
    description: '发布、编辑、下架新闻资讯内容。',
    status: '已可用',
    href: '/admin/news',
  },
  {
    id: 'ads',
    icon: '📢',
    title: '广告管理',
    description: '管理首页、招聘、房屋、二手、导航、新闻等广告位。',
    status: '已可用',
    href: '/admin/ads',
  },
  {
    id: 'top-links',
    icon: '🧭',
    title: '顶部快捷入口',
    description: '管理顶部“纽约”展开后的快捷导航入口。',
    status: '已可用',
    href: '/admin/top-links',
  },
  {
    id: 'home-sections',
    icon: '🧩',
    title: '首页最新发布',
    description: '管理首页最新招聘、房屋、二手、本地服务、新闻板块显示和排序。',
    status: '已可用',
    href: '/admin/home-sections',
  },
  {
    id: 'posts',
    icon: '🗂️',
    title: '帖子管理',
    description: '统一管理招聘、房屋、二手帖子，支持隐藏、恢复与删除。',
    status: '已可用',
    href: '/admin/posts',
  },
  {
    id: 'services',
    icon: '🧰',
    title: '本地服务管理',
    description: '管理用户发布的本地服务信息。',
    status: '已可用',
    href: '/admin/services',
  },
  {
    id: 'image-cleanup',
    icon: '🧹',
    title: '图片清理工具',
    description: '扫描未使用图片，管理员确认后删除。',
    status: '已可用',
    href: '/admin/image-cleanup',
  },
  {
    id: 'navigation',
    icon: '🗺️',
    title: '导航管理',
    description: '管理公共导航页面的分类和网址内容。',
    status: '已可用',
    href: '/admin/navigation',
  },
  {
    id: 'settings',
    icon: '⚙️',
    title: '站点设置 / 发帖上限',
    description: '管理每日发帖上限等基础配置。',
    status: '已可用',
    href: '/admin/settings',
  },
  {
    id: 'users',
    icon: '👥',
    title: '用户管理',
    description: '管理注册用户、账号状态、禁用与备注。',
    status: '已可用',
    href: '/admin/users',
  },
  {
    id: 'notifications',
    icon: '🔔',
    title: '通知管理',
    description: '查看已发送通知、已读状态和删除通知。',
    status: '已可用',
    href: '/admin/notifications',
  },
]

const ROADMAP_ITEMS = [
  '反馈管理',
  '帖子统一审核',
  '用户管理',
  '全站置顶管理',
  'SEO 工具',
]

export default function AdminHomePage() {
  const [tokenInput, setTokenInput] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [totalUsers, setTotalUsers] = useState<number | null>(null)

  async function fetchTotalUsers(token: string) {
    try {
      const res = await fetch('/api/admin/users?limit=1', {
        headers: { 'x-admin-token': token },
        cache: 'no-store',
      })
      if (!res.ok) {
        setTotalUsers(null)
        return
      }
      const json = (await res.json()) as { total?: number }
      setTotalUsers(typeof json.total === 'number' ? json.total : null)
    } catch {
      setTotalUsers(null)
    }
  }

  useEffect(() => {
    const stored = getAdminToken()
    setIsLoggedIn(Boolean(stored))
    setIsReady(true)
    if (stored) void fetchTotalUsers(stored)
  }, [])

  function handleLogin() {
    const token = tokenInput.trim()
    if (!token) return
    setAdminToken(token)
    setIsLoggedIn(true)
    setTokenInput('')
    void fetchTotalUsers(token)
  }

  function handleLogout() {
    clearAdminToken()
    setTokenInput('')
    setIsLoggedIn(false)
    setTotalUsers(null)
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:py-8">
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 md:p-6">
        <Link
          href="/"
          className="inline-flex items-center rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
        >
          ← 返回首页
        </Link>

        <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">OpenAA 管理后台</h1>
            <p className="mt-2 text-sm text-zinc-600">
              集中管理广告、新闻、反馈、本地服务和网站功能。
            </p>
          </div>
          {isReady && isLoggedIn ? (
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-green-100 bg-green-50 px-3 py-1 text-sm text-green-700">
                已登录后台
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
              >
                退出后台
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {!isReady ? null : !isLoggedIn ? (
        <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-4 md:p-6">
          <h2 className="text-lg font-semibold text-zinc-900">OpenAA 管理后台</h2>
          <p className="mt-1 text-sm text-zinc-600">请输入 Admin Token 进入后台管理入口</p>
          <label className="mt-4 block text-sm font-medium text-zinc-700">Admin Token</label>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              type="password"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="Admin Token"
              className="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={handleLogin}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              进入后台
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {ADMIN_ENTRIES.map((entry) => {
              return (
                <div key={entry.id} className="rounded-2xl border border-zinc-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-lg leading-none">{entry.icon}</p>
                      <h2 className="mt-2 text-base font-semibold text-zinc-900">{entry.title}</h2>
                      <p className="mt-1 text-sm text-zinc-600">{entry.description}</p>
                      {entry.id === 'users' ? (
                        <p className="mt-2 text-sm text-zinc-500">
                          总用户：{totalUsers === null ? '--' : totalUsers}
                        </p>
                      ) : null}
                    </div>
                    <span
                      className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${
                        entry.status === '已可用'
                          ? 'bg-emerald-50 text-emerald-700 ring-emerald-100'
                          : 'bg-zinc-100 text-zinc-600 ring-zinc-200'
                      }`}
                    >
                      {entry.status}
                    </span>
                  </div>

                  {entry.status === '已可用' && entry.href ? (
                    <Link
                      href={entry.href}
                      className="mt-3 inline-flex items-center rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100"
                    >
                      进入
                    </Link>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="mt-3 inline-flex cursor-not-allowed items-center rounded-lg border border-zinc-200 bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-400"
                    >
                      待开发
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          <section className="mt-5 rounded-2xl border border-zinc-200 bg-white p-4">
            <h2 className="text-base font-semibold text-zinc-900">后续计划</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-600">
              {ROADMAP_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        </>
      )}
      <BackToTopButton />
    </div>
  )
}
