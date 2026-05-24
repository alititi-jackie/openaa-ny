export type HomeSectionType = 'main' | 'news_category'

export type HomeSectionKey =
  | 'latest_jobs'
  | 'latest_housing'
  | 'latest_secondhand'
  | 'latest_services'
  | 'latest_news'
  | 'news_local'
  | 'news_guide'
  | 'news_dmv'
  | 'news_life'
  | 'news_announcement'

export interface HomeLatestSection {
  section_key: HomeSectionKey | string
  section_name: string
  section_type: HomeSectionType
  parent_key: string | null
  is_visible: boolean
  display_order: number
  limit_count: number
}

export const DEFAULT_HOME_LATEST_SECTIONS: HomeLatestSection[] = [
  {
    section_key: 'latest_jobs',
    section_name: '最新招聘',
    section_type: 'main',
    parent_key: null,
    is_visible: true,
    display_order: 10,
    limit_count: 6,
  },
  {
    section_key: 'latest_housing',
    section_name: '最新房屋',
    section_type: 'main',
    parent_key: null,
    is_visible: true,
    display_order: 20,
    limit_count: 6,
  },
  {
    section_key: 'latest_secondhand',
    section_name: '最新二手',
    section_type: 'main',
    parent_key: null,
    is_visible: true,
    display_order: 30,
    limit_count: 6,
  },
  {
    section_key: 'latest_services',
    section_name: '本地服务',
    section_type: 'main',
    parent_key: null,
    is_visible: true,
    display_order: 40,
    limit_count: 6,
  },
  {
    section_key: 'latest_news',
    section_name: '最新新闻',
    section_type: 'main',
    parent_key: null,
    is_visible: true,
    display_order: 50,
    limit_count: 15,
  },
  {
    section_key: 'news_local',
    section_name: '本地新闻',
    section_type: 'news_category',
    parent_key: 'latest_news',
    is_visible: true,
    display_order: 10,
    limit_count: 3,
  },
  {
    section_key: 'news_guide',
    section_name: '新手指南',
    section_type: 'news_category',
    parent_key: 'latest_news',
    is_visible: true,
    display_order: 20,
    limit_count: 3,
  },
  {
    section_key: 'news_dmv',
    section_name: 'DMV教程',
    section_type: 'news_category',
    parent_key: 'latest_news',
    is_visible: true,
    display_order: 30,
    limit_count: 3,
  },
  {
    section_key: 'news_life',
    section_name: '生活指南',
    section_type: 'news_category',
    parent_key: 'latest_news',
    is_visible: true,
    display_order: 40,
    limit_count: 3,
  },
  {
    section_key: 'news_announcement',
    section_name: '平台公告',
    section_type: 'news_category',
    parent_key: 'latest_news',
    is_visible: true,
    display_order: 50,
    limit_count: 3,
  },
]

export const NEWS_CATEGORY_BY_SECTION_KEY: Record<string, string> = {
  news_local: '本地新闻',
  news_guide: '新手指南',
  news_dmv: 'DMV教程',
  news_life: '生活指南',
  news_announcement: '平台公告',
}

export const MAIN_SECTION_ROUTE: Record<string, string> = {
  latest_jobs: '/jobs',
  latest_housing: '/housing',
  latest_secondhand: '/secondhand',
  latest_services: '/services',
  latest_news: '/news',
}

/** Fixed quick-navigation links shown above "最新发布". Always all 5, regardless of is_visible. */
export const HOME_QUICK_LINKS: { label: string; href: string }[] = [
  { label: '招聘', href: '/jobs' },
  { label: '房屋', href: '/housing' },
  { label: '二手', href: '/secondhand' },
  { label: '本地服务', href: '/services' },
  { label: '新闻', href: '/news' },
]

export function normalizeHomeLatestSection(input: Partial<HomeLatestSection>): HomeLatestSection | null {
  if (
    typeof input.section_key !== 'string' ||
    typeof input.section_name !== 'string' ||
    (input.section_type !== 'main' && input.section_type !== 'news_category') ||
    typeof input.is_visible !== 'boolean' ||
    typeof input.display_order !== 'number' ||
    !Number.isInteger(input.display_order) ||
    input.display_order < 0 ||
    typeof input.limit_count !== 'number' ||
    !Number.isInteger(input.limit_count) ||
    input.limit_count < 1 ||
    input.limit_count > 30
  ) {
    return null
  }

  return {
    section_key: input.section_key,
    section_name: input.section_name,
    section_type: input.section_type,
    parent_key: typeof input.parent_key === 'string' ? input.parent_key : null,
    is_visible: input.is_visible,
    display_order: input.display_order,
    limit_count: input.limit_count,
  }
}
