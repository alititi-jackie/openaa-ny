export interface UserProfile {
  id: string
  email: string
  username: string
  avatar_url?: string
  bio?: string
  phone?: string
  created_at: string
  updated_at: string
}

/** Partial user data returned by Supabase joined queries */
export interface JoinedUser {
  email?: string | null
  username: string
  avatar_url?: string
  status?: 'active' | 'restricted' | 'banned' | null
}

export type SecondhandItemType = 'selling' | 'buying'

export interface SecondhandItem {
  id: number
  user_id: string
  title: string
  description: string
  price: number | null
  category: string
  images: string[]
  status: 'published' | 'hidden' | 'deleted' | 'unpublished'
  views: number
  created_at: string
  updated_at: string
  type?: SecondhandItemType
  contact_name?: string | null
  phone?: string | null
  wechat?: string | null
  user?: JoinedUser
  is_pinned?: boolean
  pinned_until?: string | null
  pinned_order?: number
}

export type JobPostingType = 'hiring' | 'seeking'
export type JobSalaryUnit = '/小时' | '/月薪' | '/年薪'

export interface JobPosting {
  id: number
  user_id: string
  /**
   * Job post type.
   * - 'hiring': 招聘岗位
   * - 'seeking': 求职人才
   *
   * Optional for backward-compat with older rows / environments.
   */
  type?: JobPostingType
  contact_name?: string | null
  phone?: string | null
  wechat?: string | null
  title: string
  company: string
  description: string
  salary_min: number | null
  salary_max: number | null
  salary_unit?: JobSalaryUnit | null
  location: string
  job_type: string
  category: string
  status: 'published' | 'hidden' | 'deleted' | 'unpublished'
  views: number
  created_at: string
  updated_at: string
  user?: JoinedUser
  is_pinned?: boolean
  pinned_until?: string | null
  pinned_order?: number
}

export type HousingPostType = 'renting' | 'seeking'

export interface HousingPost {
  id: number
  user_id: string
  /**
   * Housing post type.
   * - 'renting': 房屋出租
   * - 'seeking': 求租信息
   */
  type?: HousingPostType
  title: string
  description: string
  price: number
  location: string
  room_type: string
  contact: string
  contact_name?: string | null
  phone?: string | null
  wechat?: string | null
  images: string[]
  status: 'published' | 'hidden' | 'deleted' | 'unpublished'
  views: number
  created_at: string
  updated_at: string
  user?: JoinedUser
  is_pinned?: boolean
  pinned_until?: string | null
  pinned_order?: number
}

export type PostModule = 'jobs' | 'housing' | 'secondhand' | 'services'

export type FavoriteTargetType = 'jobs' | 'housing' | 'secondhand' | 'services' | 'news' | 'dmv'

export interface Favorite {
  id: string
  user_id: string
  target_type: FavoriteTargetType
  target_id: string
  target_url: string
  title: string
  image_url: string | null
  summary: string | null
  created_at: string
}

export type NotificationAudience = 'user'
export type NotificationType = 'system' | 'announcement' | 'account' | 'content' | 'favorite' | 'dmv'

export interface Notification {
  id: string
  user_id: string
  audience: NotificationAudience
  type: NotificationType
  title: string
  body: string
  link_url: string | null
  metadata: Record<string, unknown>
  read_at: string | null
  created_at: string
  expires_at: string | null
  created_by: string | null
}

export type UnifiedPostStatus = 'published' | 'hidden' | 'deleted' | 'unpublished'

export interface UnifiedPost {
  id: number | string
  module: PostModule
  user_id: string
  title: string
  description: string
  location: string | null
  status: UnifiedPostStatus
  type: string | null
  contact_name: string | null
  phone: string | null
  wechat: string | null
  /** price for housing / secondhand */
  price_value: number | null
  /** salary range for job postings */
  salary_min: number | null
  salary_max: number | null
  salary_unit?: JobSalaryUnit | null
  images: string[] | null
  created_at: string
  updated_at: string
  is_pinned?: boolean
  pinned_until?: string | null
  pinned_order?: number
}

export type ServicePostStatus = 'active' | 'published' | 'hidden' | 'deleted'

export interface ServicePost {
  id: string
  user_id: string
  title: string
  category: string
  location: string
  description: string
  contact_name: string | null
  phone: string | null
  wechat: string | null
  price_note: string | null
  images: string[] | null
  status: ServicePostStatus
  is_active: boolean
  created_at: string | null
  updated_at: string | null
  is_pinned?: boolean
  pinned_until?: string | null
  pinned_order?: number
}

export interface NewsPost {
  id: string
  title: string
  slug: string
  category: string
  summary: string | null
  cover_image_url: string | null
  content: string
  seo_title: string | null
  seo_description: string | null
  is_published: boolean
  published_at: string | null
  created_at: string
  updated_at: string
  is_pinned?: boolean
  pinned_until?: string | null
  pinned_order?: number
}

export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}
