'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import BackToTopButton from '@/components/BackToTopButton'
import DetailBackButton from '@/components/DetailBackButton'
import {
  clearRecentViews,
  getRecentViewKey,
  getRecentViews,
  removeRecentView,
  type RecentViewItem,
  type RecentViewType,
} from '@/lib/recentViews'

const TYPE_LABELS: Record<RecentViewType, string> = {
  jobs: '招聘',
  housing: '房屋',
  secondhand: '二手',
  services: '服务',
  news: '文章',
  dmv: 'DMV',
}

const TYPE_CLASS_NAMES: Record<RecentViewType, string> = {
  jobs: 'bg-blue-50 text-blue-700 ring-blue-100',
  housing: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  secondhand: 'bg-amber-50 text-amber-700 ring-amber-100',
  services: 'bg-cyan-50 text-cyan-700 ring-cyan-100',
  news: 'bg-violet-50 text-violet-700 ring-violet-100',
  dmv: 'bg-zinc-100 text-zinc-700 ring-zinc-200',
}

function formatVisitedAt(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function RecentViewsPage() {
  const [items, setItems] = useState<RecentViewItem[]>([])

  useEffect(() => {
    setItems(getRecentViews())
  }, [])

  const handleRemove = (item: RecentViewItem) => {
    removeRecentView(getRecentViewKey(item))
    setItems(getRecentViews())
  }

  const handleClear = () => {
    clearRecentViews()
    setItems([])
  }

  return (
    <div className="min-h-screen bg-zinc-50 pb-24">
      <div className="mx-auto max-w-2xl px-4 py-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <DetailBackButton fallbackHref="/profile" label="← 返回我的" inToolbar forceHref />
          {items.length > 0 ? (
            <button
              type="button"
              onClick={handleClear}
              className="rounded-xl border border-red-100 bg-white px-3 py-2 text-sm font-medium text-red-600 shadow-sm transition hover:bg-red-50"
            >
              清空最近浏览
            </button>
          ) : null}
        </div>

        <div className="mb-5 px-1">
          <h1 className="text-2xl font-black text-zinc-900">最近浏览</h1>
          <p className="mt-1 text-sm text-zinc-500">你最近看过的内容会保存在本机浏览器中</p>
        </div>

        {items.length === 0 ? (
          <div className="rounded-2xl border border-zinc-100 bg-white px-5 py-10 text-center shadow-sm">
            <p className="text-base font-bold text-zinc-900">暂无最近浏览</p>
            <p className="mt-1 text-sm text-zinc-500">去首页逛逛</p>
            <Link
              href="/"
              className="mt-4 inline-flex rounded-xl bg-[#1976d2] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#1565c0]"
            >
              返回首页
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const key = getRecentViewKey(item)
              return (
                <div key={key} className="rounded-2xl border border-zinc-100 bg-white p-3 shadow-sm">
                  <div className="flex gap-3">
                    {item.imageUrl ? (
                      <Link href={item.url} className="block h-20 w-24 shrink-0 overflow-hidden rounded-xl bg-zinc-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover" />
                      </Link>
                    ) : (
                      <Link
                        href={item.url}
                        className="flex h-20 w-24 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-sm font-bold text-zinc-400"
                      >
                        {TYPE_LABELS[item.type]}
                      </Link>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${TYPE_CLASS_NAMES[item.type]}`}>
                          {TYPE_LABELS[item.type]}
                        </span>
                        <span className="text-xs text-zinc-400">{formatVisitedAt(item.visitedAt)}</span>
                      </div>
                      <Link href={item.url} className="mt-1 block">
                        <h2 className="line-clamp-2 text-sm font-bold leading-snug text-zinc-900">{item.title}</h2>
                        {item.summary ? <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-zinc-500">{item.summary}</p> : null}
                      </Link>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap justify-end gap-2">
                    <Link
                      href={item.url}
                      className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-100"
                    >
                      打开
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleRemove(item)}
                      className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50"
                    >
                      删除
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      <BackToTopButton />
    </div>
  )
}
