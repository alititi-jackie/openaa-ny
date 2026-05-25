export const RECENT_VIEWS_STORAGE_KEY = 'openaa_recent_views_v1'
export const RECENT_VIEWS_LIMIT = 50

export type RecentViewType = 'jobs' | 'housing' | 'secondhand' | 'services' | 'news' | 'dmv'

export type RecentViewItem = {
  type: RecentViewType
  id: string
  title: string
  url: string
  imageUrl?: string
  summary?: string
  visitedAt: string
}

export type RecentViewInput = Omit<RecentViewItem, 'visitedAt'> & {
  visitedAt?: string
}

function isBrowser() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function isValidType(value: unknown): value is RecentViewType {
  return (
    value === 'jobs' ||
    value === 'housing' ||
    value === 'secondhand' ||
    value === 'services' ||
    value === 'news' ||
    value === 'dmv'
  )
}

function normalizeItem(value: unknown): RecentViewItem | null {
  if (!value || typeof value !== 'object') return null
  const item = value as Record<string, unknown>
  if (!isValidType(item.type)) return null
  if (typeof item.id !== 'string' || !item.id.trim()) return null
  if (typeof item.title !== 'string' || !item.title.trim()) return null
  if (typeof item.url !== 'string' || !item.url.trim()) return null
  if (typeof item.visitedAt !== 'string' || Number.isNaN(new Date(item.visitedAt).getTime())) return null

  return {
    type: item.type,
    id: item.id.trim(),
    title: item.title.trim(),
    url: item.url.trim(),
    imageUrl: typeof item.imageUrl === 'string' && item.imageUrl.trim() ? item.imageUrl.trim() : undefined,
    summary: typeof item.summary === 'string' && item.summary.trim() ? item.summary.trim() : undefined,
    visitedAt: item.visitedAt,
  }
}

function sortRecentViews(items: RecentViewItem[]) {
  return [...items].sort((a, b) => new Date(b.visitedAt).getTime() - new Date(a.visitedAt).getTime())
}

function saveRecentViews(items: RecentViewItem[]) {
  if (!isBrowser()) return
  try {
    window.localStorage.setItem(RECENT_VIEWS_STORAGE_KEY, JSON.stringify(items.slice(0, RECENT_VIEWS_LIMIT)))
  } catch {
    // localStorage can be unavailable in private browsing or quota-limited environments.
  }
}

export function getRecentViews(): RecentViewItem[] {
  if (!isBrowser()) return []
  try {
    const raw = window.localStorage.getItem(RECENT_VIEWS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return sortRecentViews(parsed.map(normalizeItem).filter((item): item is RecentViewItem => Boolean(item))).slice(
      0,
      RECENT_VIEWS_LIMIT
    )
  } catch {
    return []
  }
}

export function getRecentViewKey(item: Pick<RecentViewItem, 'type' | 'id'>) {
  return `${item.type}:${item.id}`
}

export function addRecentView(input: RecentViewInput) {
  if (!isBrowser()) return
  const normalized = normalizeItem({
    ...input,
    id: String(input.id),
    visitedAt: input.visitedAt || new Date().toISOString(),
  })
  if (!normalized) return

  const nextKey = getRecentViewKey(normalized)
  const existing = getRecentViews().filter((item) => getRecentViewKey(item) !== nextKey)
  saveRecentViews([normalized, ...existing])
}

export function removeRecentView(key: string) {
  if (!isBrowser()) return
  const next = getRecentViews().filter((item) => getRecentViewKey(item) !== key)
  saveRecentViews(next)
}

export function clearRecentViews() {
  if (!isBrowser()) return
  try {
    window.localStorage.removeItem(RECENT_VIEWS_STORAGE_KEY)
  } catch {
    // noop
  }
}
