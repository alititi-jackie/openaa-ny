type JoinedUserLike = {
  status?: unknown
} | null

function normalizeJoinedUser(user: unknown): JoinedUserLike {
  if (Array.isArray(user)) {
    const first = user[0]
    return first && typeof first === 'object' ? (first as JoinedUserLike) : null
  }
  return user && typeof user === 'object' ? (user as JoinedUserLike) : null
}

export function isPublicUserStatusVisible(status: unknown): boolean {
  return status === 'active' || status === null || status === undefined
}

export function isPublicOwnerVisible(joinedUser: unknown): boolean {
  const user = normalizeJoinedUser(joinedUser)
  return isPublicUserStatusVisible(user?.status)
}

export const isOwnerPublicVisible = isPublicOwnerVisible
