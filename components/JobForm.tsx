'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { JOB_CATEGORIES, JOB_TYPES, DEFAULT_JOB_CATEGORY } from '@/lib/constants'
import { checkDailyPostLimit } from '@/lib/checkDailyPostLimit'
import { DEFAULT_LOCATION, LOCATION_OPTIONS } from '@/lib/locationOptions'
import { validateContactFields, CONTACT_MISSING_MESSAGE } from '@/lib/contactValidation'
import {
  assertUserCanCreateContent,
  assertUserCanEditOwnContent,
  BANNED_ACCOUNT_MESSAGE,
} from '@/lib/accountStatus'
import type { JobPosting, JobPostingType, JobSalaryUnit } from '@/types'

type PublishMode = JobPostingType

const JOB_LOCATIONS = LOCATION_OPTIONS
const SALARY_UNITS: JobSalaryUnit[] = ['/小时', '/月薪', '/年薪']
const DEFAULT_SALARY_UNIT: JobSalaryUnit = '/小时'

type JobLocation = (typeof JOB_LOCATIONS)[number]

interface HiringFormData {
  title: string
  company: string
  description: string
  salary: string
  salary_unit: JobSalaryUnit
  location: JobLocation
  job_type: string
  category: string
}

interface SeekingFormData {
  display_name: string
  desired_role: string
  region: JobLocation
  experience: string
  availability: string
  bio: string
}

interface Props {
  initialType?: JobPostingType
  editJob?: JobPosting | null
}

function line(label: string, value: string) {
  const v = value.trim()
  return v ? `${label}：${v}` : `${label}：-`
}

function buildSeekingDescription(seeking: SeekingFormData) {
  return [
    '【求职信息】',
    line('姓名/称呼', seeking.display_name),
    line('期望岗位', seeking.desired_role),
    line('所在地区', seeking.region),
    line('工作经验', seeking.experience),
    line('可工作时间', seeking.availability),
    '',
    '【个人简介】',
    seeking.bio.trim() || '-',
  ].join('\n')
}

function safeNumberOrNull(s: string): number | null {
  const raw = (s || '').trim()
  if (!raw) return null
  const n = parseFloat(raw)
  return Number.isFinite(n) && n > 0 ? n : null
}

function normalizeLocation(v: unknown): JobLocation {
  return JOB_LOCATIONS.includes(v as JobLocation) ? (v as JobLocation) : DEFAULT_LOCATION
}

function normalizeSalaryUnit(v: unknown): JobSalaryUnit {
  return SALARY_UNITS.includes(v as JobSalaryUnit) ? (v as JobSalaryUnit) : DEFAULT_SALARY_UNIT
}

export default function JobForm({ initialType = 'hiring', editJob = null }: Props) {
  const router = useRouter()
  const isEditing = !!editJob
  const cancelHref = isEditing ? '/profile/my-jobs' : '/jobs'

  const defaultJobType = useMemo(() => {
    // For DB NOT NULL safety, prefer “其他”
    return JOB_TYPES.includes('其他') ? '其他' : JOB_TYPES[0]
  }, [])

  const defaultCategory = DEFAULT_JOB_CATEGORY

  const [mode, setMode] = useState<PublishMode>(initialType)

  // Hiring: only description required, other fields optional in UI
  const [hiring, setHiring] = useState<HiringFormData>({
    title: '',
    company: '',
    description: '',
    salary: '',
    salary_unit: DEFAULT_SALARY_UNIT,
    location: DEFAULT_LOCATION,
    job_type: defaultJobType,
    category: defaultCategory,
  })

  // Seeking: only personal description/info content required (bio), use existing placeholders
  const [seeking, setSeeking] = useState<SeekingFormData>({
    display_name: '',
    desired_role: '',
    region: DEFAULT_LOCATION,
    experience: '',
    availability: '',
    bio: '',
  })
  const [contactName, setContactName] = useState('')
  const [phone, setPhone] = useState('')
  const [wechat, setWechat] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const bottomErrorRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (error) {
      bottomErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [error])

  // Edit mode: use DB job.type and prefill fields
  useEffect(() => {
    if (!editJob) return

    const t: JobPostingType = editJob.type === 'seeking' ? 'seeking' : 'hiring'
    setMode(t)

    if (t === 'hiring') {
      const salaryValue = editJob.salary_min != null && Number(editJob.salary_min) > 0 ? String(editJob.salary_min) : ''
      setHiring({
        title: editJob.title ?? '',
        company: editJob.company ?? '',
        description: editJob.description ?? '',
        salary: salaryValue,
        salary_unit: normalizeSalaryUnit(editJob.salary_unit),
        location: normalizeLocation(editJob.location),
        job_type: editJob.job_type ?? defaultJobType,
        category: editJob.category ?? defaultCategory,
      })
    } else {
      // We can't reliably parse structured fields back from description.
      // Keep lightweight UX: prefill required content field from existing description.
      setSeeking((prev) => ({
        ...prev,
        desired_role: editJob.title ?? '',
        region: normalizeLocation(editJob.location),
        bio: editJob.description ?? '',
      }))
    }
    setContactName(editJob.contact_name || '')
    setPhone(editJob.phone || '')
    setWechat(editJob.wechat || '')
  }, [editJob, defaultJobType, defaultCategory])

  const handleHiringChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setHiring((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSeekingChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setSeeking((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      router.push('/auth/login')
      return
    }

    const permission = isEditing
      ? await assertUserCanEditOwnContent(supabase, user.id)
      : await assertUserCanCreateContent(supabase, user.id)
    if (!permission.allowed) {
      setError(permission.message || BANNED_ACCOUNT_MESSAGE)
      setLoading(false)
      return
    }

    const salaryValue = safeNumberOrNull(hiring.salary)
    const normalizedSalaryUnit = normalizeSalaryUnit(hiring.salary_unit)

    // DB NOT NULL safe defaults (per requirements)
    const payload =
      mode === 'hiring'
        ? {
            type: 'hiring' as const,
            title: hiring.title.trim() || '招聘信息',
            company: hiring.company.trim() || '匿名发布',
            description: hiring.description.trim(),
            salary_min: salaryValue,
            salary_max: salaryValue,
            salary_unit: normalizedSalaryUnit,
            // Keep optional UX: always DB-safe value
            location: hiring.location || DEFAULT_LOCATION,
            job_type: hiring.job_type?.trim() || defaultJobType,
            category: hiring.category?.trim() || defaultCategory,
            contact_name: contactName.trim() || null,
            phone: phone.trim() || null,
            wechat: wechat.trim() || null,
            status: 'published' as const,
            views: editJob?.views ?? 0,
            user_id: user.id,
          }
        : {
            type: 'seeking' as const,
            // Existing seeking placeholders
            title: seeking.desired_role.trim() || '求职',
            company: '个人求职',
            description: isEditing ? seeking.bio.trim() : buildSeekingDescription(seeking),
            salary_min: null,
            salary_max: null,
            salary_unit: DEFAULT_SALARY_UNIT,
            // Keep optional UX: always DB-safe value
            location: seeking.region || DEFAULT_LOCATION,
            job_type: defaultJobType,
            category: defaultCategory,
            contact_name: contactName.trim() || null,
            phone: phone.trim() || null,
            wechat: wechat.trim() || null,
            status: 'published' as const,
            views: editJob?.views ?? 0,
            user_id: user.id,
          }

    // Enforce required content only
    const contentOk = mode === 'hiring' ? payload.description.trim() : seeking.bio.trim()
    if (!contentOk) {
      setError('请填写信息内容')
      setLoading(false)
      return
    }

    const contactCheck = validateContactFields(phone, wechat)
    if (!contactCheck.ok) {
      setError(contactCheck.message ?? '')
      setLoading(false)
      return
    }

    if (isEditing && editJob) {
      const editPayload: Record<string, unknown> = { ...payload }
      delete editPayload.status
      delete editPayload.views
      delete editPayload.user_id

      const { data: updated, error: updateError } = await supabase
        .from('job_postings')
        .update({ ...editPayload, updated_at: new Date().toISOString() })
        .eq('id', editJob.id)
        .eq('user_id', user.id)
        .select()
        .single()

      if (updateError || !updated) {
        setError('保存失败：未找到记录或无权限')
        setLoading(false)
        return
      }

      router.push('/profile/my-jobs')
      return
    }

    // New post: check daily limit before inserting
    const limitResult = await checkDailyPostLimit(supabase, user.id)
    if (!limitResult.allowed) {
      setError(limitResult.message ?? '暂时无法验证发帖次数，请稍后重试。')
      setLoading(false)
      return
    }

    const { data, error: insertError } = await supabase
      .from('job_postings')
      .insert(payload)
      .select()
      .single()

    if (insertError) {
      setError('发布失败，请重试')
      setLoading(false)
      return
    }

    router.push(`/jobs/${data.id}`)
  }

  const isDailyLimitError = error.includes('今天发布的信息已达到平台限制')

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
      {error && <div className="bg-red-50 text-red-600 rounded-lg p-3 text-sm">{error}</div>}

      {/* Mode switch */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">发布类型</label>
        <div className="inline-flex rounded-xl bg-gray-100 p-1">
          <button
            type="button"
            onClick={() => setMode('hiring')}
            disabled={isEditing}
            className={
              mode === 'hiring'
                ? 'px-4 py-2 text-sm font-semibold rounded-lg bg-white text-gray-900 shadow-sm'
                : 'px-4 py-2 text-sm font-semibold rounded-lg text-gray-600 hover:text-gray-900'
            }
          >
            我要招人
          </button>
          <button
            type="button"
            onClick={() => setMode('seeking')}
            disabled={isEditing}
            className={
              mode === 'seeking'
                ? 'px-4 py-2 text-sm font-semibold rounded-lg bg-white text-gray-900 shadow-sm'
                : 'px-4 py-2 text-sm font-semibold rounded-lg text-gray-600 hover:text-gray-900'
            }
          >
            我要求职
          </button>
        </div>
      </div>

      {mode === 'hiring' ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">职位名称</label>
              <input
                type="text"
                name="title"
                value={hiring.title}
                onChange={handleHiringChange}
                placeholder="不填默认：招聘信息"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1976d2] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">公司名称</label>
              <input
                type="text"
                name="company"
                value={hiring.company}
                onChange={handleHiringChange}
                placeholder="不填则不显示公司名称"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1976d2] focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">工作类型</label>
              <select
                name="job_type"
                value={hiring.job_type}
                onChange={handleHiringChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1976d2] focus:border-transparent"
              >
                {JOB_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-400">不选默认：其它职位</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">职位分类</label>
              <select
                name="category"
                value={hiring.category}
                onChange={handleHiringChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1976d2] focus:border-transparent"
              >
                {JOB_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-400">不选默认：其它职位</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">工作地点</label>
            <select
              name="location"
              value={hiring.location}
              onChange={handleHiringChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1976d2] focus:border-transparent"
            >
              {JOB_LOCATIONS.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-400">默认：纽约 New York</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">薪资（USD）</label>
              <input
                type="number"
                name="salary"
                value={hiring.salary}
                onChange={handleHiringChange}
                min="0"
                placeholder="不填则显示：薪资电议"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1976d2] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">薪资单位</label>
              <select
                name="salary_unit"
                value={hiring.salary_unit}
                onChange={handleHiringChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1976d2] focus:border-transparent"
              >
                {SALARY_UNITS.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">信息内容 / 职位描述 *</label>
            <textarea
              name="description"
              value={hiring.description}
              onChange={handleHiringChange}
              required
              rows={6}
              placeholder="请写清楚：招聘岗位、要求、待遇、联系方式等（可只写一段内容）"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1976d2] focus:border-transparent resize-none"
            />
          </div>
        </>
      ) : (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">姓名/称呼</label>
            <input
              type="text"
              name="display_name"
              value={seeking.display_name}
              onChange={handleSeekingChange}
              placeholder="例：Jackie / 王女士（可不填）"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1976d2] focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">期望岗位</label>
              <input
                type="text"
                name="desired_role"
                value={seeking.desired_role}
                onChange={handleSeekingChange}
                placeholder="不填默认：求职"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1976d2] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">工作地点</label>
              <select
                name="region"
                value={seeking.region}
                onChange={handleSeekingChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1976d2] focus:border-transparent"
              >
                {JOB_LOCATIONS.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-400">默认：纽约 New York</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">工作经验</label>
              <input
                type="text"
                name="experience"
                value={seeking.experience}
                onChange={handleSeekingChange}
                placeholder="例：3年 / 应届（可不填）"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1976d2] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">可工作时间</label>
              <input
                type="text"
                name="availability"
                value={seeking.availability}
                onChange={handleSeekingChange}
                placeholder="例：随时 / 两周后（可不填）"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1976d2] focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">信息内容 / 个人简介 *</label>
            <textarea
              name="bio"
              value={seeking.bio}
              onChange={handleSeekingChange}
              required
              rows={7}
              placeholder="简单介绍技能、经历、求职意向等（可只写一段内容）"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1976d2] focus:border-transparent resize-none"
            />
            <p className="mt-2 text-xs text-gray-400">
              提示：求职信息会以“格式化文本”的方式保存到描述字段中（不新增多列）。
            </p>
          </div>
        </>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">联系人</label>
        <input
          type="text"
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
          placeholder="请输入联系人"
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1976d2] focus:border-transparent"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">联系电话</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="请输入联系电话"
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1976d2] focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">微信号</label>
          <input
            type="text"
            value={wechat}
            onChange={(e) => setWechat(e.target.value)}
            placeholder="请输入微信号"
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1976d2] focus:border-transparent"
          />
        </div>
      </div>

      <div ref={bottomErrorRef}>
        {error && (
          <div className="mb-4 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-600">
            {error}
            {error === CONTACT_MISSING_MESSAGE && (
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => setError('')}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
                >
                  返回修改
                </button>
              </div>
            )}
          </div>
        )}
        {isDailyLimitError && (
          <div className="mt-3 flex flex-wrap gap-3">
            <Link
              href="/profile"
              className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-600"
            >
              返回我的页面
            </Link>
            <Link
              href="/"
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600"
            >
              返回首页
            </Link>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-[#1976d2] text-white py-3 rounded-lg font-medium hover:bg-[#1565c0] transition disabled:opacity-50"
        >
          {loading ? (isEditing ? '保存中...' : '发布中...') : isEditing ? '保存修改' : '发布'}
        </button>
        <Link
          href={cancelHref}
          className="flex-1 text-center py-3 rounded-lg font-medium text-gray-600 ring-1 ring-gray-300 bg-white hover:bg-gray-50 transition"
        >
          取消
        </Link>
      </div>
    </form>
  )
}
