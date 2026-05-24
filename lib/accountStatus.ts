import type { SupabaseClient } from '@supabase/supabase-js'

export type AccountStatus = 'active' | 'restricted' | 'banned'

export type AccountPermissionResult = {
  allowed: boolean
  status: AccountStatus | 'unknown'
  message?: string
}

export const BANNED_ACCOUNT_MESSAGE = '此账号因收到用户投诉或内容异常，已被限制发布新内容。请先修改或删除相关内容。如有疑问，请到“我的”页面提交反馈与举报联系 OpenAA。'
export const RESTRICTED_ACCOUNT_MESSAGE = BANNED_ACCOUNT_MESSAGE
export const ACCOUNT_STATUS_CHECK_FAILED_MESSAGE = '账号状态暂时无法验证，请稍后重试。'

export function normalizeAccountStatus(value: unknown): AccountStatus | null {
  if (value === 'active' || value === 'restricted' || value === 'banned') return value
  return null
}

export function getAccountStatusMessage(status: AccountStatus | 'unknown'): string {
  if (status === 'banned') return BANNED_ACCOUNT_MESSAGE
  if (status === 'restricted') return RESTRICTED_ACCOUNT_MESSAGE
  return ACCOUNT_STATUS_CHECK_FAILED_MESSAGE
}

export function isUserBlocked(status: AccountStatus | 'unknown'): boolean {
  return status !== 'active'
}

export function isActiveAccountStatus(status: AccountStatus | 'unknown'): boolean {
  return status === 'active'
}

export function isRestrictedOrBannedStatus(status: AccountStatus | 'unknown'): boolean {
  return status === 'restricted' || status === 'banned'
}

export async function getUserAccountStatus(
  supabase: SupabaseClient,
  userId: string
): Promise<AccountPermissionResult> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('status')
      .eq('id', userId)
      .maybeSingle()

    if (error || !data) {
      return {
        allowed: false,
        status: 'unknown',
        message: ACCOUNT_STATUS_CHECK_FAILED_MESSAGE,
      }
    }

    const status = normalizeAccountStatus((data as { status?: unknown }).status)
    if (!status) {
      return {
        allowed: false,
        status: 'unknown',
        message: ACCOUNT_STATUS_CHECK_FAILED_MESSAGE,
      }
    }

    return { allowed: true, status }
  } catch {
    return {
      allowed: false,
      status: 'unknown',
      message: ACCOUNT_STATUS_CHECK_FAILED_MESSAGE,
    }
  }
}

function allowKnownAccountStatus(result: AccountPermissionResult): AccountPermissionResult {
  if (!result.allowed) return result
  return { allowed: true, status: result.status }
}

function allowOnlyActiveAccountStatus(result: AccountPermissionResult): AccountPermissionResult {
  if (!result.allowed) return result
  if (result.status === 'active') return { allowed: true, status: result.status }
  return {
    allowed: false,
    status: result.status,
    message: getAccountStatusMessage(result.status),
  }
}

export async function assertUserCanCreateContent(
  supabase: SupabaseClient,
  userId: string
): Promise<AccountPermissionResult> {
  return allowOnlyActiveAccountStatus(await getUserAccountStatus(supabase, userId))
}

export async function assertUserCanEditOwnContent(
  supabase: SupabaseClient,
  userId: string
): Promise<AccountPermissionResult> {
  return allowKnownAccountStatus(await getUserAccountStatus(supabase, userId))
}

export async function assertUserCanDeleteOwnContent(
  supabase: SupabaseClient,
  userId: string
): Promise<AccountPermissionResult> {
  return allowKnownAccountStatus(await getUserAccountStatus(supabase, userId))
}

export async function assertUserCanHideContent(
  supabase: SupabaseClient,
  userId: string
): Promise<AccountPermissionResult> {
  return allowOnlyActiveAccountStatus(await getUserAccountStatus(supabase, userId))
}

export async function assertUserCanRestoreContent(
  supabase: SupabaseClient,
  userId: string
): Promise<AccountPermissionResult> {
  return allowOnlyActiveAccountStatus(await getUserAccountStatus(supabase, userId))
}

export async function assertUserCanPostOrEdit(
  supabase: SupabaseClient,
  userId: string
): Promise<AccountPermissionResult> {
  return assertUserCanCreateContent(supabase, userId)
}
