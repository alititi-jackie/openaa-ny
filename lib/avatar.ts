const SUPABASE_PUBLIC_STORAGE_MARKER = '/storage/v1/object/public/'

export function getMetadataAvatarUrl(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== 'object') return null
  const data = metadata as Record<string, unknown>
  const candidates = [data.avatar_url, data.picture]

  for (const value of candidates) {
    if (typeof value !== 'string') continue
    const trimmed = value.trim()
    if (trimmed) return trimmed
  }

  return null
}

export function getPublicStorageObjectPath(publicUrl: string, bucket: string): string | null {
  if (!publicUrl) return null

  try {
    const url = new URL(publicUrl)
    const markerIndex = url.pathname.indexOf(SUPABASE_PUBLIC_STORAGE_MARKER)
    if (markerIndex < 0) return null

    const bucketAndPath = url.pathname.slice(markerIndex + SUPABASE_PUBLIC_STORAGE_MARKER.length)
    const expectedPrefix = `${bucket}/`
    if (!bucketAndPath.startsWith(expectedPrefix)) return null

    const objectPath = decodeURIComponent(bucketAndPath.slice(expectedPrefix.length))
    return objectPath || null
  } catch {
    return null
  }
}

export function isOwnAvatarObjectPath(objectPath: string | null, userId: string): objectPath is string {
  if (!objectPath || !userId) return false
  const [folder] = objectPath.split('/')
  return folder === userId
}
