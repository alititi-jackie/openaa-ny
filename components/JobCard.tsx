import Link from 'next/link'
import { formatDate, formatSalary, formatJobLocation } from '@/lib/utils'
import type { JobPosting } from '@/types'

interface Props {
  job: JobPosting
}

function toSortableTime(value: string | null | undefined): number {
  if (!value) return 0
  const time = new Date(value).getTime()
  return Number.isNaN(time) ? 0 : time
}

function isEffectivePinned(job: JobPosting, nowTime: number): boolean {
  if (!job.is_pinned) return false
  if (job.status !== 'published') return false
  if (!job.pinned_until) return true
  return toSortableTime(job.pinned_until) > nowTime
}

export default function JobCard({ job }: Props) {
  const salary = formatSalary(job.salary_min, job.salary_max, job.salary_unit)
  const companyName = job.company?.trim() || ''
  const isPinned = isEffectivePinned(job, Date.now())
  return (
    <Link href={`/jobs/${job.id}`}>
      <div className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition cursor-pointer border border-gray-100">
        <div className="flex justify-between items-start gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-gray-900 text-lg line-clamp-2">{job.title}</h3>
            {companyName && companyName !== '匿名发布' ? (
              <p className="text-gray-600 mt-1 line-clamp-1 break-all">{companyName}</p>
            ) : null}
          </div>
          <span className="max-w-[9rem] truncate text-sm bg-blue-50 text-[#1976d2] px-2 py-1 rounded font-medium shrink-0">
            {job.job_type}
          </span>
        </div>

        <p className="text-green-600 font-semibold mt-2">{salary}</p>

        <div className="flex items-center gap-3 mt-3 text-sm text-gray-500">
          {isPinned ? (
            <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 border border-amber-100">
              置顶
            </span>
          ) : null}
          <span>📍 {formatJobLocation(job.location)}</span>
          <span>·</span>
          <span>{job.category}</span>
        </div>

        <div className="mt-3">
          <p className="text-gray-500 text-sm line-clamp-2">{job.description}</p>
          <span className="text-xs text-gray-400 mt-1 block">{formatDate(job.created_at)}</span>
        </div>
      </div>
    </Link>
  )
}
