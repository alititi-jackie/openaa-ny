export const DEFAULT_MAX_PAGE_SIZE = 50
export const DEFAULT_MAX_SEARCH_LENGTH = 80

export function parsePositiveIntParam(
  value: string | null,
  defaultValue: number,
  maxValue = DEFAULT_MAX_PAGE_SIZE
): number {
  const normalized = (value || '').trim()
  if (!/^\d+$/.test(normalized)) return defaultValue
  const parsed = Number.parseInt(normalized, 10)
  if (!Number.isFinite(parsed) || parsed < 1) return defaultValue
  return Math.min(parsed, maxValue)
}

export function parsePageParam(value: string | null): number {
  return parsePositiveIntParam(value, 1, Number.MAX_SAFE_INTEGER)
}

export function clampPageSize(
  value: string | null,
  defaultValue = 20,
  maxValue = DEFAULT_MAX_PAGE_SIZE
): number {
  return parsePositiveIntParam(value, defaultValue, maxValue)
}

export function normalizeSearchParam(
  value: string | null,
  maxLength = DEFAULT_MAX_SEARCH_LENGTH
): string {
  return (value || '').trim().slice(0, maxLength)
}
