import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { UnifiedPost } from '@/types'

export const dynamic = 'force-dynamic'

type AdminPostModule = UnifiedPost['module']

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function checkAdminToken(request: NextRequest): boolean {
  const token = request.headers.get('x-admin-token')
  return token === process.env.ADMIN_TOKEN && !!process.env.ADMIN_TOKEN
}

/** Parse the location embedded in secondhand description lines like "所在地区：法拉盛 Flushing" */
function parseLocationFromDescription(description: string): string | null {
  if (!description) return null
  for (const line of description.split('\n')) {
    const m = line.match(/^所在地区[:：]\s*(.+)$/)
    if (m?.[1]) return m[1].trim()
  }
  return null
}

function toSortableTime(value: string | null | undefined): number {
  if (!value) return 0
  const t = new Date(value).getTime()
  return Number.isNaN(t) ? 0 : t
}

function isEffectivePinned(post: UnifiedPost, nowTime: number): boolean {
  if (!post.is_pinned) return false
  if (post.status !== 'published') return false
  if (!post.pinned_until) return true
  return toSortableTime(post.pinned_until) > nowTime
}

function normalizeServiceStatus(status: unknown): UnifiedPost['status'] {
  if (status === 'hidden' || status === 'deleted' || status === 'unpublished') return status
  return 'published'
}

export async function GET(request: NextRequest) {
  if (!checkAdminToken(request)) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const moduleParam = searchParams.get('module')
  const moduleFilter =
    moduleParam === 'jobs' ||
    moduleParam === 'housing' ||
    moduleParam === 'secondhand' ||
    moduleParam === 'services' ||
    moduleParam === 'all'
      ? moduleParam
      : null
  const userIdFilter = searchParams.get('user_id')?.trim()

  const supabase = getServiceClient()
  const results: UnifiedPost[] = []
  const fetchErrors: string[] = []

  const wantJobs = !moduleFilter || moduleFilter === 'all' || moduleFilter === ('jobs' satisfies AdminPostModule)
  const wantHousing = !moduleFilter || moduleFilter === 'all' || moduleFilter === ('housing' satisfies AdminPostModule)
  const wantSecondhand =
    !moduleFilter || moduleFilter === 'all' || moduleFilter === ('secondhand' satisfies AdminPostModule)
  const wantServices = !moduleFilter || moduleFilter === 'all' || moduleFilter === ('services' satisfies AdminPostModule)

  const [jobsResult, housingResult, secondhandResult, servicesResult] = await Promise.all([
    wantJobs
      ? (() => {
          const query = supabase
            .from('job_postings')
            .select('*')
            .order('created_at', { ascending: false })
          return userIdFilter ? query.eq('user_id', userIdFilter) : query
        })()
      : Promise.resolve({ data: null, error: null }),

    wantHousing
      ? (() => {
          const query = supabase
            .from('housing_posts')
            .select('*')
            .order('created_at', { ascending: false })
          return userIdFilter ? query.eq('user_id', userIdFilter) : query
        })()
      : Promise.resolve({ data: null, error: null }),

    wantSecondhand
      ? (() => {
          const query = supabase
            .from('secondhand_items')
            .select('*')
            .order('created_at', { ascending: false })
          return userIdFilter ? query.eq('user_id', userIdFilter) : query
        })()
      : Promise.resolve({ data: null, error: null }),

    wantServices
      ? (() => {
          const query = supabase
            .from('service_posts')
            .select(
              'id, title, description, location, category, contact_name, phone, wechat, status, is_active, created_at, updated_at, user_id, images, is_pinned, pinned_until, pinned_order'
            )
            .order('created_at', { ascending: false })
          return userIdFilter ? query.eq('user_id', userIdFilter) : query
        })()
      : Promise.resolve({ data: null, error: null }),
  ])

  if (jobsResult.error) {
    fetchErrors.push(`招聘: ${jobsResult.error.message}`)
  } else if (jobsResult.data) {
    for (const row of jobsResult.data) {
      results.push({
        id: row.id as number,
        module: 'jobs',
        user_id: row.user_id as string,
        title: (row.title as string) || '',
        description: (row.description as string) || '',
        location: (row.location as string | null) || null,
        status: (row.status as string) as UnifiedPost['status'],
        type: (row.type as string | null) || null,
        contact_name: (row.contact_name as string | null) || null,
        phone: (row.phone as string | null) || null,
        wechat: (row.wechat as string | null) || null,
        price_value: null,
        salary_min: row.salary_min != null ? Number(row.salary_min) : null,
        salary_max: row.salary_max != null ? Number(row.salary_max) : null,
        salary_unit: (typeof row.salary_unit === 'string' ? row.salary_unit : null),
        images: null,
        created_at: (row.created_at as string) || '',
        updated_at: (row.updated_at as string) || '',
        is_pinned: row.is_pinned === true,
        pinned_until: (row.pinned_until as string | null) || null,
        pinned_order:
          typeof row.pinned_order === 'number' && Number.isInteger(row.pinned_order) && row.pinned_order >= 0
            ? row.pinned_order
            : 0,
      })
    }
  }

  if (housingResult.error) {
    fetchErrors.push(`房屋: ${housingResult.error.message}`)
  } else if (housingResult.data) {
    for (const row of housingResult.data) {
      const rawImages = row.images
      const images: string[] | null = Array.isArray(rawImages) ? (rawImages as string[]) : null
      results.push({
        id: row.id as number,
        module: 'housing',
        user_id: row.user_id as string,
        title: (row.title as string) || '',
        description: (row.description as string) || '',
        location: (row.location as string | null) || null,
        status: (row.status as string) as UnifiedPost['status'],
        type: (row.type as string | null) || null,
        contact_name: (row.contact_name as string | null) || null,
        phone: (row.phone as string | null) || null,
        wechat: (row.wechat as string | null) || null,
        price_value: row.price != null ? Number(row.price) : null,
        salary_min: null,
        salary_max: null,
        salary_unit: null,
        images,
        created_at: (row.created_at as string) || '',
        updated_at: (row.updated_at as string) || '',
        is_pinned: row.is_pinned === true,
        pinned_until: (row.pinned_until as string | null) || null,
        pinned_order:
          typeof row.pinned_order === 'number' && Number.isInteger(row.pinned_order) && row.pinned_order >= 0
            ? row.pinned_order
            : 0,
      })
    }
  }

  if (secondhandResult.error) {
    fetchErrors.push(`二手: ${secondhandResult.error.message}`)
  } else if (secondhandResult.data) {
    for (const row of secondhandResult.data) {
      const rawImages = row.images
      const images: string[] | null = Array.isArray(rawImages) ? (rawImages as string[]) : null
      // location may be a column or embedded in description
      const locationCol = row.location as string | null | undefined
      const trimmedCol = typeof locationCol === 'string' ? locationCol.trim() : ''
      const location = trimmedCol
        ? trimmedCol
        : parseLocationFromDescription((row.description as string) || '')
      results.push({
        id: row.id as number,
        module: 'secondhand',
        user_id: row.user_id as string,
        title: (row.title as string) || '',
        description: (row.description as string) || '',
        location,
        status: (row.status as string) as UnifiedPost['status'],
        type: (row.type as string | null) || null,
        contact_name: (row.contact_name as string | null) || null,
        phone: (row.phone as string | null) || null,
        wechat: (row.wechat as string | null) || null,
        price_value: row.price != null ? Number(row.price) : null,
        salary_min: null,
        salary_max: null,
        salary_unit: null,
        images,
        created_at: (row.created_at as string) || '',
        updated_at: (row.updated_at as string) || '',
        is_pinned: row.is_pinned === true,
        pinned_until: (row.pinned_until as string | null) || null,
        pinned_order:
          typeof row.pinned_order === 'number' && Number.isInteger(row.pinned_order) && row.pinned_order >= 0
            ? row.pinned_order
            : 0,
      })
    }
  }

  if (servicesResult.error) {
    fetchErrors.push(`本地服务: ${servicesResult.error.message}`)
  } else if (servicesResult.data) {
    for (const row of servicesResult.data) {
      const rawImages = row.images
      const images: string[] | null = Array.isArray(rawImages) ? (rawImages as string[]) : null
      results.push({
        id: row.id as string,
        module: 'services',
        user_id: row.user_id as string,
        title: (row.title as string) || '',
        description: (row.description as string) || '',
        location: (row.location as string | null) || null,
        status: normalizeServiceStatus(row.status),
        type: (row.category as string | null) || null,
        contact_name: (row.contact_name as string | null) || null,
        phone: (row.phone as string | null) || null,
        wechat: (row.wechat as string | null) || null,
        price_value: null,
        salary_min: null,
        salary_max: null,
        salary_unit: null,
        images,
        created_at: (row.created_at as string) || '',
        updated_at: (row.updated_at as string) || '',
        is_pinned: row.is_pinned === true,
        pinned_until: (row.pinned_until as string | null) || null,
        pinned_order:
          typeof row.pinned_order === 'number' && Number.isInteger(row.pinned_order) && row.pinned_order >= 0
            ? row.pinned_order
            : 0,
      })
    }
  }

  const nowTime = Date.now()
  results.sort((a, b) => {
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

  if (fetchErrors.length > 0 && results.length === 0) {
    return NextResponse.json({ error: fetchErrors.join('；') }, { status: 400 })
  }

  return NextResponse.json({
    data: results,
    ...(fetchErrors.length > 0 ? { warnings: fetchErrors } : {}),
  })
}
