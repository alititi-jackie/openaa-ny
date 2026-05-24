'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { formatDate, formatSalary, formatJobLocation } from '@/lib/utils'
import PostSafetyNotice from '@/components/PostSafetyNotice'
import AdminReturnButton from '@/components/AdminReturnButton'
import DetailBackButton from '@/components/DetailBackButton'
import BackToTopButton from '@/components/BackToTopButton'
import ContactInfoCard from '@/components/ContactInfoCard'
import DetailShareCard from '@/components/DetailShareCard'
import ShareButton from '@/components/ShareButton'
import { isPublicOwnerVisible } from '@/lib/publicVisibility'
import type { JobPosting } from '@/types'

export default function JobDetailPage() {
  const { id } = useParams()
  const [job, setJob] = useState<JobPosting | null>(null)
  const [loading, setLoading] = useState(true)
  const [showContactInfo, setShowContactInfo] = useState(false)

  useEffect(() => {
    const fetchJob = async () => {
      setShowContactInfo(false)
      const { data } = await supabase
        .from('job_postings')
        .select('*, user:users(username, avatar_url, status)')
        .eq('id', id)
        .eq('status', 'published')
        .single()

      if (data && isPublicOwnerVisible((data as JobPosting).user)) {
        setJob(data)
        await supabase
          .from('job_postings')
          .update({ views: (data.views || 0) + 1 })
          .eq('id', id)
      }
      setLoading(false)
    }
    fetchJob()
  }, [id])

  if (loading) return <div className="flex justify-center py-20 text-gray-500">加载中...</div>
  if (!job) return <div className="flex justify-center py-20 text-gray-500">职位不存在</div>

  const salary = formatSalary(job.salary_min, job.salary_max, job.salary_unit)
  const companyName = job.company?.trim() || ''
  const hasContactInfo = Boolean((job.contact_name || '').trim() || (job.phone || '').trim() || (job.wechat || '').trim())

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 pb-24">
      <AdminReturnButton />
      <div className="flex items-center justify-between">
        <DetailBackButton fallbackHref="/jobs" inToolbar />
        <ShareButton
          path={`/jobs/${String(id)}`}
          title={job.title}
          text={`${job.job_type} · ${formatJobLocation(job.location)}${salary ? ` · ${salary}` : ''}`}
        />
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{job.title}</h1>
            {companyName && companyName !== '匿名发布' ? (
              <p className="text-lg text-gray-600 mt-1">{companyName}</p>
            ) : null}
          </div>
          <span className="bg-blue-50 text-[#1976d2] px-3 py-1 rounded-full text-sm font-medium">
            {job.job_type}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="bg-green-50 rounded-lg p-3">
            <p className="text-xs text-gray-500">薪资</p>
            <p className="font-semibold text-green-600">{salary}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500">工作地点</p>
            <p className="font-semibold text-gray-900">📍 {formatJobLocation(job.location)}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-3 text-sm text-gray-500">
          <span className="bg-gray-100 px-2 py-1 rounded">{job.category}</span>
          <span>👁 {job.views || 0} 次浏览</span>
          <span>{formatDate(job.created_at)}</span>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-3">职位描述</h2>
          <p className="text-gray-600 whitespace-pre-wrap leading-relaxed">{job.description}</p>

          <PostSafetyNotice variant="contact" />
        </div>

        {hasContactInfo ? (
          <div className="mt-4 pt-4 border-t border-gray-100">
            {showContactInfo ? (
              <ContactInfoCard
                title="联系招聘方"
                contactName={job.contact_name}
                phone={job.phone}
                wechat={job.wechat}
              />
            ) : (
              <button
                type="button"
                onClick={() => setShowContactInfo(true)}
                className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4 text-center text-base font-medium text-blue-600"
              >
                查看联系方式
              </button>
            )}
          </div>
        ) : null}

        <DetailShareCard
          path={`/jobs/${String(id)}`}
          title={job.title}
          text={`${job.job_type} · ${formatJobLocation(job.location)}${salary ? ` · ${salary}` : ''}`}
        />

        <div className="mt-6 pt-4 border-t border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#1976d2] flex items-center justify-center text-white font-bold">
            {job.user?.username?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div>
            <p className="font-medium text-gray-900">{job.user?.username ?? '匿名用户'}</p>
            <p className="text-xs text-gray-500">发布者</p>
          </div>
        </div>

        <PostSafetyNotice variant="safety" />
      </div>
      <BackToTopButton />
    </div>
  )
}
