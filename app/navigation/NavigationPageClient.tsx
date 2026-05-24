'use client'

import React, { useCallback, useRef, useState } from 'react'
import { ExternalLink } from 'lucide-react'
import Link from 'next/link'
import AppTopSection from '@/components/AppTopSection'
import BackToTopButton from '@/components/BackToTopButton'
import DetailBackButton from '@/components/DetailBackButton'
import ShareButton from '@/components/ShareButton'
import ChannelSeoSection from '@/components/ChannelSeoSection'

type OpenMode = 'auto' | 'same' | 'new'

interface NavCategory {
  id: string
  name: string
  slug: string
  sort_order: number
  display_limit: number
}

interface NavLink {
  id: string
  category_id: string
  title: string
  url: string
  description: string | null
  open_mode: OpenMode
  sort_order: number
}

interface NavigationPageClientProps {
  initialCategories: NavCategory[]
  initialLinks: NavLink[]
  fetchError: string | null
}

const OPENAA_HOSTS = ['openaa.com', 'www.openaa.com', 'ny.openaa.com', 'app.openaa.com']

function resolveOpenMode(url: string, mode: OpenMode): 'same' | 'new' {
  if (mode === 'same') return 'same'
  if (mode === 'new') return 'new'
  if (url.startsWith('/') || url.startsWith('#')) return 'same'
  try {
    const host = new URL(url).hostname.replace(/^www\./, '')
    if (OPENAA_HOSTS.some((item) => host === item || host.endsWith(`.${item}`))) return 'same'
  } catch {
    return 'same'
  }
  return 'new'
}

const SLUG_SHORT_NAME: Record<string, string> = {
  featured: '热门',
  government: '政府',
  finance: '银行',
  shopping: '购物',
  telecom: '通讯',
  ai: 'AI',
  video: '视频',
  social: '社交',
  life: '生活',
  other: '其它',
}

function LinkCard({ link }: { link: NavLink }) {
  const target = resolveOpenMode(link.url, link.open_mode)
  const isNew = target === 'new'

  const inner = (
    <div className="flex items-center justify-between gap-2">
      <div className="truncate text-[12.5px] font-bold text-zinc-900" title={link.title}>
        {link.title}
      </div>
      {isNew ? <ExternalLink size={13} className="shrink-0 text-zinc-400" /> : null}
    </div>
  )

  const className =
    'group block rounded-2xl bg-zinc-50 px-3 py-3 ring-1 ring-zinc-100 transition hover:bg-white hover:ring-zinc-200'

  if (isNew) {
    return (
      <a href={link.url} target="_blank" rel="noopener noreferrer" className={className}>
        {inner}
        {link.description ? <div className="mt-1 line-clamp-2 text-[11px] text-zinc-500">{link.description}</div> : null}
      </a>
    )
  }

  return (
    <Link href={link.url} className={className}>
      {inner}
      {link.description ? <div className="mt-1 line-clamp-2 text-[11px] text-zinc-500">{link.description}</div> : null}
    </Link>
  )
}

function CategorySection({
  category,
  links,
  sectionRef,
}: {
  category: NavCategory
  links: NavLink[]
  sectionRef: React.RefObject<HTMLElement>
}) {
  const [expanded, setExpanded] = useState(false)
  const displayLinks = expanded ? links : links.slice(0, category.display_limit)
  const hasMore = links.length > category.display_limit

  return (
    <section ref={sectionRef} id={`section-${category.slug}`} className="scroll-mt-24">
      <div className="mb-2 flex items-center justify-between px-1">
        <h2 className="text-[14px] font-black text-zinc-900 md:text-[15px]">{category.name}</h2>
        {hasMore ? (
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="ml-2 shrink-0 text-[12px] font-medium text-blue-600 hover:text-blue-700"
          >
            {expanded ? '收起' : `更多 (${links.length})`}
          </button>
        ) : null}
      </div>

      <div className="rounded-3xl bg-white p-3 shadow-[0_10px_35px_rgba(0,0,0,0.06)] ring-1 ring-black/5">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {displayLinks.map((link) => (
            <LinkCard key={link.id} link={link} />
          ))}
        </div>
      </div>
    </section>
  )
}

const SCROLL_DISTANCE = 200

function CategoryTabs({
  categories,
  activeSlug,
  onSelect,
}: {
  categories: NavCategory[]
  activeSlug: string
  onSelect: (slug: string) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)

  const tabClassName = (active: boolean) =>
    `flex-shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
      active ? 'border-[#1976d2] bg-[#1976d2] text-white' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
    }`

  return (
    <div className="sticky top-14 z-40 mb-2 border-b border-zinc-100 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="flex items-center gap-2 px-4 py-2">
        <button type="button" className={tabClassName(activeSlug === 'all')} onClick={() => onSelect('all')}>
          全部
        </button>

        <div className="relative flex min-w-0 flex-1 items-center">
          <button
            type="button"
            onClick={() => scrollRef.current?.scrollBy({ left: -SCROLL_DISTANCE, behavior: 'smooth' })}
            className="mr-1 hidden h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm transition hover:bg-gray-50 md:flex"
            aria-label="向左滚动"
          >
            ‹
          </button>

          <div
            ref={scrollRef}
            className="min-w-0 flex-1 overflow-x-auto overflow-y-hidden whitespace-nowrap [touch-action:pan-x] [overscroll-behavior-x:contain] [overscroll-behavior-y:contain] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            role="region"
            aria-label="分类筛选"
          >
            <div className="flex flex-nowrap items-center gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.slug}
                  type="button"
                  className={tabClassName(activeSlug === cat.slug)}
                  onClick={() => onSelect(cat.slug)}
                >
                  {SLUG_SHORT_NAME[cat.slug] ?? cat.name}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => scrollRef.current?.scrollBy({ left: SCROLL_DISTANCE, behavior: 'smooth' })}
            className="ml-1 hidden h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm transition hover:bg-gray-50 md:flex"
            aria-label="向右滚动"
          >
            ›
          </button>
        </div>
      </div>
    </div>
  )
}

export default function NavigationPageClient({
  initialCategories,
  initialLinks,
  fetchError,
}: NavigationPageClientProps) {
  const [activeSlug, setActiveSlug] = useState<string>('all')
  const sectionRefs = useRef<Map<string, React.RefObject<HTMLElement>>>(new Map())

  function getSectionRef(slug: string): React.RefObject<HTMLElement> {
    if (!sectionRefs.current.has(slug)) {
      sectionRefs.current.set(slug, React.createRef<HTMLElement>())
    }
    return sectionRefs.current.get(slug)!
  }

  const categoriesWithLinks = initialCategories
    .map((category) => ({ cat: category, links: initialLinks.filter((link) => link.category_id === category.id) }))
    .filter(({ links }) => links.length > 0)

  const handleSelect = useCallback((slug: string) => {
    setActiveSlug(slug)
    if (slug === 'all') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    const ref = sectionRefs.current.get(slug)
    if (ref?.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [])

  return (
    <div className="min-h-screen bg-zinc-50">
      <AppTopSection bannerPosition="navigation" />

      <div className="mx-auto w-full max-w-[860px] px-4 pt-4">
        <div className="mb-6 flex items-center justify-between">
          <DetailBackButton fallbackHref="/" label="← 返回首页" inToolbar forceHref />
          <ShareButton path="/navigation" title="OpenAA 生活导航" text="在美华人常用网站入口与生活服务导航。" />
        </div>
      </div>

      <div className="mx-auto mb-4 w-full max-w-[860px] px-4 pt-0">
        <Link
          href="/navigation/my"
          className="block rounded-3xl bg-gradient-to-r from-blue-50 to-sky-50 px-4 py-4 shadow-[0_10px_35px_rgba(0,0,0,0.06)] ring-1 ring-blue-100 transition hover:-translate-y-0.5 hover:shadow-[0_14px_38px_rgba(0,0,0,0.08)]"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[15px] font-black text-zinc-900">我的导航</div>
              <div className="mt-1 text-[12px] text-zinc-500">保存自己的常用网站，下次打开更方便</div>
            </div>
            <div className="shrink-0 rounded-2xl bg-blue-600 px-3 py-1.5 text-[13px] font-bold text-white">进入 →</div>
          </div>
        </Link>
      </div>

      {categoriesWithLinks.length > 0 ? (
        <CategoryTabs
          categories={categoriesWithLinks.map(({ cat }) => cat)}
          activeSlug={activeSlug}
          onSelect={handleSelect}
        />
      ) : null}

      <div className="mx-auto w-full max-w-[860px] px-4 pt-6 pb-16">
        {fetchError ? (
          <p className="py-16 text-center text-sm text-red-500">{fetchError}</p>
        ) : categoriesWithLinks.length === 0 ? (
          <p className="py-16 text-center text-sm text-zinc-400">导航内容正在整理中，请稍后再来。</p>
        ) : (
          <div className="space-y-5">
            {categoriesWithLinks.map(({ cat, links }) => (
              <CategorySection key={cat.id} category={cat} links={links} sectionRef={getSectionRef(cat.slug)} />
            ))}
          </div>
        )}

        {categoriesWithLinks.length > 0 ? (
          <ChannelSeoSection
            title="纽约华人导航频道说明"
            paragraphs={[
              'OpenAA 导航频道面向纽约华人日常上网与办事需求，集中整理纽约华人导航常用入口，包括 DMV、银行、移民、税务、招聘、房屋、二手与生活服务网站。为了提升搜索引擎识别效果，页面底部提供了更完整的正文说明，即使外部站点图标或数据加载较慢，核心主题仍可被稳定抓取。',
              '这个频道适合刚到美国需要快速建立“常用网站清单”的新移民，也适合已经在纽约生活但希望减少重复搜索的用户。你可以按分类查看并保存自己的常用入口，例如先把 DMV、USCIS、银行与保险相关页面加入“我的导航”，再逐步补齐工作、租房和家庭生活所需资源。',
              'OpenAA 的帮助在于把分散的网址整合成有结构的导航页面，并保留中文分类语义，降低信息检索门槛。真实使用场景中，很多法拉盛与皇后区用户会在办事前先打开导航页，快速跳转到官方或常用平台，避免每次临时搜索导致链接混乱；家庭成员之间也能共享一套更清晰的办事路径。',
            ]}
            highlights={['适合用户：纽约华人家庭、新移民、需要高频访问办事网站的用户', '核心功能：分类导航、站点说明、我的导航收藏、常用入口快速跳转', '典型入口：DMV、银行、移民、税务、生活服务与本地资讯']}
          />
        ) : null}
      </div>
      <BackToTopButton />
    </div>
  )
}
