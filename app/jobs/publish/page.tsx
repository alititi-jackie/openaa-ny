'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { assertUserCanCreateContent, BANNED_ACCOUNT_MESSAGE } from '@/lib/accountStatus'
import JobForm from '@/components/JobForm'
import type { JobPosting, JobPostingType } from '@/types'

function normalizeType(v: string | null): JobPostingType {
  return v === 'seeking' ? 'seeking' : 'hiring'
}

function parseEditId(v: string | null): number | null {
  if (!v) return null
  const n = parseInt(v, 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

type AuthStatus = 'checking' | 'not-logged-in' | 'email-not-verified' | 'ok'

function PublishJobPageInner() {
  const searchParams = useSearchParams()

  const editId = useMemo(() => parseEditId(searchParams.get('edit')), [searchParams])
  const initialType = useMemo(() => normalizeType(searchParams.get('type')), [searchParams])

  const [authStatus, setAuthStatus] = useState<AuthStatus>('checking')
  const [checking, setChecking] = useState(true)
  const [loadingEdit, setLoadingEdit] = useState(false)
  const [error, setError] = useState('')
  const [editJob, setEditJob] = useState<JobPosting | null>(null)

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      setError('')
      setEditJob(null)

      let authedUserId: string | null = null

      try {
        const { data, error: authError } = await supabase.auth.getUser()
        const user = authError ? null : (data?.user ?? null)

        if (!user) {
          if (!cancelled) {
            setAuthStatus('not-logged-in')
            setChecking(false)
          }
          return
        }

        if (!user.email_confirmed_at) {
          if (!cancelled) {
            setAuthStatus('email-not-verified')
            setChecking(false)
          }
          return
        }

        if (!editId) {
          const permission = await assertUserCanCreateContent(supabase, user.id)
          if (!permission.allowed) {
            if (!cancelled) {
              setAuthStatus('ok')
              setError(permission.message || BANNED_ACCOUNT_MESSAGE)
              setChecking(false)
            }
            return
          }
        }

        authedUserId = user.id
        if (!cancelled) setAuthStatus('ok')
      } catch {
        if (!cancelled) {
          setAuthStatus('not-logged-in')
          setChecking(false)
        }
        return
      }

      // No edit => ready
      if (!editId) {
        if (!cancelled) setChecking(false)
        return
      }

      // Edit mode => load + verify owner before prefilling
      if (!cancelled) {
        setLoadingEdit(true)
        setChecking(false)
      }

      const { data, error: fetchError } = await supabase
        .from('job_postings')
        .select('*')
        .eq('id', editId)
        .single()

      if (cancelled) return

      if (fetchError || !data) {
        setError('信息不存在或已被删除')
        setLoadingEdit(false)
        return
      }

      if (data.user_id !== authedUserId) {
        setError('无权限编辑该信息')
        setLoadingEdit(false)
        return
      }

      setEditJob(data)
      setLoadingEdit(false)
    }

    run()

    return () => {
      cancelled = true
    }
  }, [editId])

  if (authStatus === 'checking' || checking) return <div className="flex justify-center py-20 text-gray-500">验证中...</div>

  if (authStatus === 'not-logged-in') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <div className="bg-white rounded-2xl shadow-sm p-6 w-full max-w-md mx-auto text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-3">请先登录</h1>
          <p className="text-gray-600 text-sm mb-6">登录后才可以发布信息。</p>
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

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{editId ? '编辑信息' : '发布信息'}</h1>

      {error && <div className="bg-red-50 text-red-600 rounded-lg p-3 text-sm mb-4">{error}</div>}

      {loadingEdit ? (
        <div className="flex justify-center py-20 text-gray-500">加载中...</div>
      ) : error ? null : (
        <JobForm initialType={initialType} editJob={editJob} />
      )}
    </div>
  )
}

export default function PublishJobPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20 text-gray-500">加载中...</div>}>
      <PublishJobPageInner />
    </Suspense>
  )
}
