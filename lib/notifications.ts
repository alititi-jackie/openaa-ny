import { NextResponse } from 'next/server'

export const NOTIFICATION_TYPES = ['system', 'announcement', 'account', 'content', 'favorite', 'dmv'] as const

export type NotificationType = (typeof NOTIFICATION_TYPES)[number]

export const NOTIFICATIONS_SELECT =
  'id, user_id, audience, type, title, body, link_url, metadata, read_at, created_at, expires_at, created_by'

export const MAX_NOTIFICATION_TITLE_LENGTH = 200
export const MAX_NOTIFICATION_BODY_LENGTH = 1000
export const MAX_NOTIFICATION_URL_LENGTH = 2048

export function isNotificationType(value: unknown): value is NotificationType {
  return typeof value === 'string' && (NOTIFICATION_TYPES as readonly string[]).includes(value)
}

export function toTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function toNullableTrimmedString(value: unknown): string | null {
  if (value === undefined || value === null) return null
  const text = toTrimmedString(value)
  return text || null
}

export function toOptionalIsoDate(value: unknown): string | null | undefined {
  if (value === undefined || value === null) return null
  if (typeof value !== 'string') return undefined
  const text = value.trim()
  if (!text) return null
  const parsed = new Date(text)
  if (Number.isNaN(parsed.getTime())) return undefined
  return parsed.toISOString()
}

export function isPlainMetadata(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export function validateNotificationText(title: string, body: string, linkUrl: string | null) {
  if (!title) return NextResponse.json({ error: 'title is required' }, { status: 400 })
  if (!body) return NextResponse.json({ error: 'body is required' }, { status: 400 })
  if (title.length > MAX_NOTIFICATION_TITLE_LENGTH) {
    return NextResponse.json({ error: 'title is too long' }, { status: 400 })
  }
  if (body.length > MAX_NOTIFICATION_BODY_LENGTH) {
    return NextResponse.json({ error: 'body is too long' }, { status: 400 })
  }
  if (linkUrl && linkUrl.length > MAX_NOTIFICATION_URL_LENGTH) {
    return NextResponse.json({ error: 'link_url is too long' }, { status: 400 })
  }
  return null
}
