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
import { formatSalary } from '@/lib/utils'
import BackToTopButton from '@/components/BackToTopButton'
import DetailBackButton from '@/components/DetailBackButton'
import type { JobPosting } from '@/types'

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

function jobTypeLabel(t?: string) {
  return t === 'seeking' ? '求职' : '招聘'
}

function jobTypeBadgeClass(t?: string) {
  return t === 'seeking'
    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'
    : 'bg-blue-50 text-blue-700 ring-1 ring-blue-100'
}

function displaySalary(job: JobPosting) {
  return formatSalary(job.salary_min, job.salary_max, job.salary_unit)
}

function isAdminHidden(job: JobPosting) {
  return job.status === 'hidden' && job.admin_hidden === true
}

function statusLabel(job: JobPosting) {
  if (job.status === 'deleted') return '已删除'
  if (isAdminHidden(job)) return '已被管理员下架'
  if (job.status === 'hidden') return '已隐藏'
  return '显示中'
}

function statusBadgeClass(job: JobPosting) {
  if (job.status === 'deleted') return 'bg-red-50 text-red-600 ring-1 ring-red-100'
  if (isAdminHidden(job)) return 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
  if (job.status === 'hidden') return 'bg-zinc-50 text-zinc-600 ring-1 ring-zinc-100'
  return 'bg-blue-50 text-blue-700 ring-1 ring-blue-100'
}

export default function MyJobsPage() {
  const router = useRouter()
  const [jobs, setJobs] = useState<JobPosting[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchJobs = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      const { data } = await supabase
        .from('job_postings')
        .select('*')
        .eq('user_id', user.id)
        .neq('status', 'deleted')
        .order('created_at', { ascending: false })

      setJobs(data || [])
      setLoading(false)
    }
    fetchJobs()
  }, [router])

  const handleHide = async (id: number) => {
    if (!confirm('确认隐藏此招聘信息？')) return

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
      .from('job_postings')
      .update({ status: 'hidden', updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      alert(`操作失败：${error.message}`)
      return
    }

    setJobs((prev) =>
      prev.map((job) => (job.id === id ? { ...job, status: 'hidden', admin_hidden: false } : job))
    )
  }

  const handleRestore = async (id: number) => {
    if (jobs.some((job) => job.id === id && isAdminHidden(job))) return

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
      .from('job_postings')
      .update({ status: 'published', updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)
      .eq('status', 'hidden')
      .eq('admin_hidden', false)

    if (error) {
      alert(`操作失败：${error.message}`)
      return
    }

    setJobs((prev) => prev.map((job) => (job.id === id ? { ...job, status: 'published' } : job)))
  }

  const handleDelete = async (id: number) => {
    if (!confirm('确认删除此职位？')) return

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
      .from('job_postings')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      alert(`删除失败：${error.message}`)
      return
    }

    setJobs((prev) => prev.filter((job) => job.id !== id))
  }

  if (loading) return <div className="flex justify-center py-20 text-gray-500">加载中...</div>

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-24">
      <DetailBackButton fallbackHref="/profile" />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">我的招聘</h1>
          <p className="text-sm text-gray-500 mt-1">管理您发布的招聘岗位与求职信息</p>
        </div>
        <Link
          href="/jobs/publish"
          className="h-10 shrink-0 whitespace-nowrap px-4 flex items-center text-sm text-blue-600 bg-blue-50 border border-blue-100 rounded-xl hover:bg-blue-100 transition"
        >
          + 发布招聘
        </Link>
      </div>

      {jobs.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
          <div className="text-4xl mb-3">💼</div>
          <p className="text-gray-700 font-medium">你还没有发布招聘信息</p>
          <Link
            href="/jobs/publish"
            className="inline-flex mt-4 bg-[#1976d2] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#1565c0] transition"
          >
            立即发布
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => (
            <div key={job.id} className="rounded-2xl border border-gray-100 bg-white shadow-sm p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-900 line-clamp-2">
                      {job.title}
                    </h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusBadgeClass(job)}`}>
                      {statusLabel(job)}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${jobTypeBadgeClass(job.type)}`}>
                      {jobTypeLabel(job.type)}
                    </span>
                    {job.job_type ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-50 text-zinc-600 ring-1 ring-zinc-100">
                        {job.job_type}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-2 text-sm text-gray-600 flex flex-wrap gap-x-4 gap-y-1">
                    <span>💰 {displaySalary(job)}</span>
                    {job.location ? <span>📍 {job.location}</span> : null}
                    <span>🕒 {formatDate(job.created_at)}</span>
                  </div>
                </div>
              </div>

              {isAdminHidden(job) ? (
                <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  该内容已被管理员下架，暂时不会在公开页面展示。你可以修改后重新提交，或删除该内容。
                </div>
              ) : null}

              <div className="mt-4 flex items-center gap-2 flex-wrap">
                {job.status === 'published' ? (
                  <Link
                    href={`/jobs/${job.id}`}
                    className="px-3 py-2 rounded-lg text-sm text-zinc-800 ring-1 ring-zinc-300 bg-white hover:bg-zinc-50 transition"
                  >
                    查看
                  </Link>
                ) : null}
                <Link
                  href={`/jobs/edit/${job.id}`}
                  className="px-3 py-2 rounded-lg text-sm text-zinc-800 ring-1 ring-zinc-300 bg-white hover:bg-zinc-50 transition"
                >
                  编辑
                </Link>
                {job.status === 'published' ? (
                  <button
                    onClick={() => handleHide(job.id)}
                    className="px-3 py-2 rounded-lg text-sm text-amber-700 ring-1 ring-amber-200 bg-amber-50 hover:bg-amber-100 transition"
                  >
                    隐藏
                  </button>
                ) : job.status === 'hidden' && !isAdminHidden(job) ? (
                  <button
                    onClick={() => handleRestore(job.id)}
                    className="px-3 py-2 rounded-lg text-sm text-emerald-700 ring-1 ring-emerald-200 bg-emerald-50 hover:bg-emerald-100 transition"
                  >
                    恢复显示
                  </button>
                ) : null}
                <button
                  onClick={() => handleDelete(job.id)}
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
