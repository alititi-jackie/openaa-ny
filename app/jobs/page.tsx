'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import AppTopSection from '@/components/AppTopSection'
import JobCard from '@/components/JobCard'
import BackToTopButton from '@/components/BackToTopButton'
import DetailBackButton from '@/components/DetailBackButton'
import ShareButton from '@/components/ShareButton'
import ChannelSeoSection from '@/components/ChannelSeoSection'
import { JOB_CATEGORIES, JOB_TYPES } from '@/lib/constants'
import RegionFilter, { ALL_REGIONS } from '@/components/RegionFilter'
import { isPublicOwnerVisible } from '@/lib/publicVisibility'
import { getSiteUrl } from '@/lib/site'
import type { JobPosting, JobPostingType } from '@/types'

const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: 'OpenAA 招聘频道',
  alternateName: ['美国华人招聘', '纽约招聘', '找工作', '168招聘'],
  url: getSiteUrl('/jobs'),
  description:
    'OpenAA 招聘频道为美国华人提供招聘求职信息，涵盖纽约招聘、兼职、全职、餐馆、司机、仓库、电工、装修等工作信息，帮助华人更方便找工作和发布招聘。',
  isPartOf: {
    '@type': 'WebSite',
    name: 'OpenAA',
    url: getSiteUrl('/'),
  },
}

const TABS: Array<{ key: JobPostingType; label: string }> = [
  { key: 'hiring', label: '招聘岗位' },
  { key: 'seeking', label: '求职人才' },
]

function toSortableTime(value: string | null | undefined): number {
  if (!value) return 0
  const time = new Date(value).getTime()
  return Number.isNaN(time) ? 0 : time
}

function isEffectivePinned(post: JobPosting, nowTime: number): boolean {
  if (!post.is_pinned) return false
  if (post.status !== 'published') return false
  if (!post.pinned_until) return true
  return toSortableTime(post.pinned_until) > nowTime
}

export default function JobsPage() {
  const [activeTab, setActiveTab] = useState<JobPostingType>('hiring')
  const [jobs, setJobs] = useState<JobPosting[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [jobType, setJobType] = useState('')
  const [category, setCategory] = useState('')
  const [location, setLocation] = useState(ALL_REGIONS)

  const fetchJobs = useCallback(async () => {
    setLoading(true)

    // Note: 'type' is a new column; some environments might not have it yet.
    // We try applying the filter, and if it errors we fall back to the old query.
    const baseQuery = supabase
      .from('job_postings')
      .select('*, user:users(status)')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(50)

    let query = baseQuery
    query = query.eq('type', activeTab)

    if (jobType) query = query.eq('job_type', jobType)
    if (category) query = query.eq('category', category)

    const { data, error } = await query
    if (!error) {
      setJobs((data || []).filter((job) => isPublicOwnerVisible((job as JobPosting).user)) as JobPosting[])
      setLoading(false)
      return
    }

    // Fallback: ignore type filter (for older DB without the column)
    let fallback = baseQuery
    if (jobType) fallback = fallback.eq('job_type', jobType)
    if (category) fallback = fallback.eq('category', category)

    const { data: fallbackData } = await fallback
    setJobs(((fallbackData || []) as JobPosting[]).filter((job) => isPublicOwnerVisible(job.user)))
    setLoading(false)
  }, [activeTab, jobType, category])

  useEffect(() => {
    fetchJobs()
  }, [fetchJobs])

  const filtered = useMemo(() => {
    const searchLower = search.toLowerCase()
    const nowTime = Date.now()
    return jobs
      .filter((job) =>
        (!search ||
          job.title.toLowerCase().includes(searchLower) ||
          job.company.toLowerCase().includes(searchLower) ||
          job.location.toLowerCase().includes(searchLower)) &&
        (location === ALL_REGIONS || job.location === location)
      )
      .sort((a, b) => {
        const aPinned = isEffectivePinned(a, nowTime)
        const bPinned = isEffectivePinned(b, nowTime)
        if (aPinned !== bPinned) return aPinned ? -1 : 1

        if (aPinned && bPinned) {
          const pinnedOrderDiff = (a.pinned_order ?? 0) - (b.pinned_order ?? 0)
          if (pinnedOrderDiff !== 0) return pinnedOrderDiff

          const createdAtDiff = toSortableTime(b.created_at) - toSortableTime(a.created_at)
          if (createdAtDiff !== 0) return createdAtDiff
        }

        return toSortableTime(b.created_at) - toSortableTime(a.created_at)
      })
  }, [jobs, search, location])

  const pageTitle = activeTab === 'hiring' ? '招聘信息' : '求职信息'
  const publishLabel = activeTab === 'hiring' ? '发布职位' : '发布求职'

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* JSON-LD: lightweight, page-level only */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <AppTopSection bannerPosition="jobs" />

      <div className="max-w-4xl mx-auto px-4 py-6 pb-24">
        <div className="mb-6 flex items-center justify-between gap-3">
          <DetailBackButton fallbackHref="/" label="← 返回首页" inToolbar forceHref />
          <ShareButton path="/jobs" title="OpenAA 招聘频道" text="纽约招聘、求职、兼职全职与行业岗位信息。" />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h1 className="text-2xl font-bold text-gray-900">{pageTitle}</h1>
          <Link
            href={`/jobs/publish?type=${activeTab}`}
            className="bg-[#1976d2] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#1565c0] transition"
          >
            + {publishLabel}
          </Link>
        </div>

        {/* Tabs */}
        <div className="mb-6 overflow-x-auto overflow-y-hidden py-1 [touch-action:pan-x] [overscroll-behavior-x:contain] [overscroll-behavior-y:contain]">
          <div className="inline-flex flex-nowrap rounded-xl bg-gray-100 p-1">
            {TABS.map((t) => {
              const isActive = t.key === activeTab
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setActiveTab(t.key)}
                  className={
                    isActive
                      ? 'inline-flex min-h-9 items-center rounded-lg bg-white px-4 py-2 text-sm font-semibold leading-none text-gray-900 shadow-sm'
                      : 'inline-flex min-h-9 items-center rounded-lg px-4 py-2 text-sm font-semibold leading-none text-gray-600 hover:text-gray-900'
                  }
                >
                  {t.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索职位、公司、地点..."
            className="w-full flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1976d2] focus:border-transparent sm:min-w-48"
          />
          <select
            value={jobType}
            onChange={(e) => setJobType(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1976d2] focus:border-transparent sm:w-auto"
          >
            <option value="">工作类型</option>
            {JOB_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1976d2] focus:border-transparent sm:w-auto"
          >
            <option value="">职位分类</option>
            {JOB_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <RegionFilter
            value={location}
            onChange={setLocation}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1976d2] focus:border-transparent sm:w-auto"
          />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">加载中...</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
            <div className="text-4xl mb-3">💼</div>
            <p className="font-medium text-gray-900">暂无相关信息</p>
            <p className="mt-2 text-sm text-gray-500">可以换个关键词或地区试试，也可以发布第一条信息。</p>
            <Link
              href="/jobs/publish"
              className="mt-4 inline-flex bg-[#1976d2] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#1565c0] transition"
            >
              发布招聘
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}

        <ChannelSeoSection
          title="纽约华人招聘与求职频道说明"
          paragraphs={[
            'OpenAA 招聘频道面向纽约和周边华人社区，覆盖纽约华人招聘、法拉盛找工作、兼职、全职、餐馆招聘、仓库配送、门店销售等常见岗位。很多用户在工作空档用手机快速浏览信息，先看区域、工时和薪资，再决定是否联系，因此页面底部保留了完整文字介绍，方便搜索引擎与用户同时理解频道主题。',
            '如果你是刚到美国的新移民、留学生家属，或者正在从一份工作转向另一份工作，这里适合用来做第一轮筛选。你可以先按招聘岗位或求职人才切换，再结合关键词和地区过滤，把法拉盛、皇后区、布鲁克林等常见华人生活圈的机会先收拢出来。无论是找餐馆后厨、前台、兼职帮工，还是寻找全职稳定岗位，都能在同一页面持续对比。',
            'OpenAA 提供的是更贴近日常使用场景的入口：招聘方能快速发布职位并补充公司信息，华人求职者可以直接查看最近发布内容，减少在多个群里反复翻记录的时间。比如你白天上班只能晚上找工，回家后仍可按行业和区域快速定位岗位；如果你在法拉盛临时想找周末兼职，也可以直接通过“兼职”关键词筛选，提高沟通效率。',
          ]}
          highlights={['适合用户：纽约华人求职者、招聘商家、新移民与留学生家庭', '核心功能：招聘/求职切换、关键词搜索、地区筛选、按发布时间查看', '使用建议：先锁定区域与岗位类型，再联系发布者确认工时、薪资与到岗时间']}
        />
      </div>

      <BackToTopButton />
    </div>
  )
}
