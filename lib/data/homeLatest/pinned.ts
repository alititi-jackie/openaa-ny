export function toSortableTime(value: string | null | undefined): number {
  if (!value) return 0
  const time = new Date(value).getTime()
  return Number.isNaN(time) ? 0 : time
}

export function isPinnedActive(
  item: { is_pinned?: boolean | null; pinned_until?: string | null },
  nowTime: number
): boolean {
  if (!item.is_pinned) return false
  if (!item.pinned_until) return true
  return toSortableTime(item.pinned_until) > nowTime
}

export async function fetchPinnedFirst<T extends { id: string | number }>(
  pinnedQuery: PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  normalQuery: PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  limit: number
): Promise<T[]> {
  const [pinnedRes, normalRes] = await Promise.all([pinnedQuery, normalQuery])
  if (pinnedRes.error && normalRes.error) return []

  const merged: T[] = []
  const seen = new Set<string>()

  for (const row of [...(pinnedRes.data ?? []), ...(normalRes.data ?? [])]) {
    const key = String(row.id)
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(row)
    if (merged.length >= limit) break
  }

  return merged.slice(0, limit)
}
