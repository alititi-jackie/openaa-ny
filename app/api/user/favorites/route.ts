import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { authenticateUserRequest } from '@/lib/request-auth'
import type { Database } from '@/lib/supabase-types'
import type { FavoriteTargetType } from '@/types'

export const dynamic = 'force-dynamic'

const FAVORITE_TARGET_TYPES = ['jobs', 'housing', 'secondhand', 'services', 'news', 'dmv'] as const

const FAVORITES_SELECT = 'id, user_id, target_type, target_id, target_url, title, image_url, summary, created_at'
const MAX_TARGET_ID_LENGTH = 128
const MAX_URL_LENGTH = 2048
const MAX_TITLE_LENGTH = 200
const MAX_SUMMARY_LENGTH = 500

function isFavoriteTargetType(value: unknown): value is FavoriteTargetType {
  return typeof value === 'string' && (FAVORITE_TARGET_TYPES as readonly string[]).includes(value)
}

function toTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function toNullableTrimmedString(value: unknown): string | null {
  if (value === undefined || value === null) return null
  const text = toTrimmedString(value)
  return text || null
}

function validateMaxLength(name: string, value: string | null, maxLength: number) {
  if (value && value.length > maxLength) {
    return NextResponse.json({ error: `${name} is too long` }, { status: 400 })
  }
  return null
}

async function getExistingFavorite(
  supabase: SupabaseClient<Database>,
  userId: string,
  targetType: FavoriteTargetType,
  targetId: string
) {
  return supabase
    .from('favorites')
    .select(FAVORITES_SELECT)
    .eq('user_id', userId)
    .eq('target_type', targetType)
    .eq('target_id', targetId)
    .single()
}

export async function GET(request: NextRequest) {
  const auth = await authenticateUserRequest(request)
  if ('errorResponse' in auth) return auth.errorResponse

  const targetTypeParam = request.nextUrl.searchParams.get('target_type')
  let targetType: FavoriteTargetType | null = null
  if (targetTypeParam) {
    if (!isFavoriteTargetType(targetTypeParam)) {
      return NextResponse.json({ error: 'Invalid target_type' }, { status: 400 })
    }
    targetType = targetTypeParam
  }

  let query = auth.supabase
    .from('favorites')
    .select(FAVORITES_SELECT)
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: false })

  if (targetType) {
    query = query.eq('target_type', targetType)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ data: data ?? [] })
}

export async function POST(request: NextRequest) {
  const auth = await authenticateUserRequest(request)
  if ('errorResponse' in auth) return auth.errorResponse

  const body: unknown = await request.json()
  if (body === null || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const payload = body as Record<string, unknown>
  if ('user_id' in payload) {
    return NextResponse.json({ error: 'user_id is not allowed' }, { status: 400 })
  }

  const targetType = payload.target_type
  if (!isFavoriteTargetType(targetType)) {
    return NextResponse.json({ error: 'Invalid target_type' }, { status: 400 })
  }

  const targetId = toTrimmedString(payload.target_id)
  const targetUrl = toTrimmedString(payload.target_url)
  const title = toTrimmedString(payload.title)
  const imageUrl = toNullableTrimmedString(payload.image_url)
  const summary = toNullableTrimmedString(payload.summary)

  if (!targetId) return NextResponse.json({ error: 'target_id is required' }, { status: 400 })
  if (!targetUrl) return NextResponse.json({ error: 'target_url is required' }, { status: 400 })
  if (!title) return NextResponse.json({ error: 'title is required' }, { status: 400 })

  const lengthError =
    validateMaxLength('target_id', targetId, MAX_TARGET_ID_LENGTH) ||
    validateMaxLength('target_url', targetUrl, MAX_URL_LENGTH) ||
    validateMaxLength('title', title, MAX_TITLE_LENGTH) ||
    validateMaxLength('image_url', imageUrl, MAX_URL_LENGTH) ||
    validateMaxLength('summary', summary, MAX_SUMMARY_LENGTH)

  if (lengthError) return lengthError

  const insertPayload = {
    user_id: auth.user.id,
    target_type: targetType,
    target_id: targetId,
    target_url: targetUrl,
    title,
    image_url: imageUrl,
    summary,
  }

  const { data, error } = await auth.supabase
    .from('favorites')
    .insert(insertPayload)
    .select(FAVORITES_SELECT)
    .single()

  if (!error) return NextResponse.json({ data }, { status: 201 })

  if (error.code === '23505') {
    const { data: existing, error: existingError } = await getExistingFavorite(
      auth.supabase,
      auth.user.id,
      targetType,
      targetId
    )
    if (existingError) return NextResponse.json({ error: existingError.message }, { status: 400 })
    return NextResponse.json({ data: existing })
  }

  return NextResponse.json({ error: error.message }, { status: 400 })
}
