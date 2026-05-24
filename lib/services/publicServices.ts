import type { SupabaseClient } from '@supabase/supabase-js'
import { isPublicUserStatusVisible } from '@/lib/publicVisibility'

type PublicServiceFilter = {
  location?: string
  category?: string
  search?: string
  id?: string
}

export type PublicServiceRow = {
  id: string
  title: string | null
  category: string | null
  location: string | null
  description: string | null
  contact_name?: string | null
  phone?: string | null
  wechat?: string | null
  price_note: string | null
  images: unknown
  status: string | null
  is_active?: boolean | null
  created_at: string | null
  updated_at: string | null
  is_pinned?: boolean | null
  pinned_until?: string | null
  pinned_order?: number | null
  user_id: string
}

type UserStatusRow = {
  id: string
  status: string | null
}

function isAllRegion(value: string) {
  const v = value.trim()
  return !v || v === '全部地区' || v === '全部' || v.toLowerCase() === 'all'
}

function isAllCategory(value: string) {
  const v = value.trim()
  return !v || v === '全部'
}

function escapeLikePattern(value: string): string {
  return value.replace(/[%_]/g, (m) => `\\${m}`)
}

function ensureArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

function toSortableTime(value: unknown): number {
  if (!value || typeof value !== 'string') return 0
  const time = new Date(value).getTime()
  return Number.isNaN(time) ? 0 : time
}

function isVisiblePostStatus(status: unknown): boolean {
  return status === 'active' || status === 'published'
}

function isEffectivePinned(
  row: Pick<PublicServiceRow, 'is_pinned' | 'pinned_until' | 'status'>,
  nowTime: number
): boolean {
  if (row.is_pinned !== true) return false
  if (!isVisiblePostStatus(row.status)) return false
  if (!row.pinned_until) return true
  return toSortableTime(row.pinned_until) > nowTime
}

function isServicePublicRow(value: unknown): value is PublicServiceRow {
  if (!value || typeof value !== 'object') return false
  const row = value as { id?: unknown; user_id?: unknown }
  return (typeof row.id === 'string' || typeof row.id === 'number') && typeof row.user_id === 'string'
}

async function queryPublicServiceRows(
  supabase: SupabaseClient,
  filter: PublicServiceFilter
) {
  const location = (filter.location || '').trim()
  const category = (filter.category || '').trim()
  const search = (filter.search || '').trim()
  const id = (filter.id || '').trim()

  const buildQuery = (withIsActive: boolean) => {
    const selectFields = withIsActive
      ? 'id, title, category, location, description, contact_name, phone, wechat, price_note, images, status, is_active, created_at, updated_at, is_pinned, pinned_until, pinned_order, user_id'
      : 'id, title, category, location, description, contact_name, phone, wechat, price_note, images, status, created_at, updated_at, is_pinned, pinned_until, pinned_order, user_id'

    let query = supabase
      .from('service_posts')
      .select(selectFields)
      .in('status', ['active', 'published'])
      .order('created_at', { ascending: false })

    if (id) {
      query = query.eq('id', id)
    }

    if (!isAllRegion(location)) {
      query = query.eq('location', location)
    }

    if (!isAllCategory(category)) {
      query = query.eq('category', category)
    }

    if (search) {
      const q = escapeLikePattern(search)
      query = query.or(
        [
          `title.ilike.%${q}%`,
          `description.ilike.%${q}%`,
          `category.ilike.%${q}%`,
          `location.ilike.%${q}%`,
        ].join(',')
      )
    }

    return query
  }

  const first = await buildQuery(true)
  if (!first.error) return first

  const errMsg = first.error.message.toLowerCase()
  const isMissingIsActiveColumn =
    errMsg.includes('is_active') && (errMsg.includes('does not exist') || errMsg.includes('column'))

  if (!isMissingIsActiveColumn) return first
  return buildQuery(false)
}

export async function listPublicServices(
  supabase: SupabaseClient,
  filter: PublicServiceFilter
): Promise<{ data: PublicServiceRow[]; error: string | null }> {
  const { data, error } = await queryPublicServiceRows(supabase, filter)
  if (error) {
    return { data: [], error: error.message }
  }

  const rows = ensureArray<unknown>(data)
    .filter(isServicePublicRow)
    .map((row) => ({ ...row, id: String(row.id) }))
    .filter((row) => row.is_active !== false)

  const userIds = Array.from(new Set(rows.map((row) => row.user_id).filter(Boolean)))
  const userStatusMap = new Map<string, string | null>()

  if (userIds.length > 0) {
    const { data: userRows } = await supabase.from('users').select('id, status').in('id', userIds)
    for (const row of (userRows || []) as UserStatusRow[]) {
      userStatusMap.set(row.id, row.status ?? null)
    }
  }

  const visibleByUser = rows.filter((row) => {
    const userStatus = userStatusMap.get(row.user_id)
    return isPublicUserStatusVisible(userStatus)
  })

  const nowTime = Date.now()
  visibleByUser.sort((a, b) => {
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

  return { data: visibleByUser, error: null }
}

export async function getPublicServiceById(
  supabase: SupabaseClient,
  id: string
): Promise<{ data: PublicServiceRow | null; error: string | null }> {
  const { data, error } = await listPublicServices(supabase, { id })
  if (error) return { data: null, error }
  return { data: data[0] ?? null, error: null }
}
