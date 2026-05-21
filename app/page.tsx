import type { Metadata } from 'next'
import AppTopSection from '@/components/AppTopSection'
import GridMenu from '@/components/GridMenu'
import LatestPostsSection from '@/components/LatestPostsSection'
import InfoCardsSection from '@/components/InfoCardsSection'
import BackToTopButton from '@/components/BackToTopButton'
import { getSiteUrl } from '@/lib/site'

const HOME_CANONICAL = getSiteUrl('/')

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'OpenAA｜纽约站｜美国华人生活入口｜华人招聘、房屋、二手、DMV、本地服务',
  description:
    'OpenAA 是面向美国华人的生活信息平台，提供华人招聘、找工作、房屋租售、二手市场、DMV 驾照信息、本地服务、新闻资讯和实用导航，帮助美国华人和美华人更方便地生活、找工作、找房子和获取本地信息。',
  alternates: {
    canonical: HOME_CANONICAL,
  },
}

const structuredData = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'OpenAA',
    alternateName: ['华人 OpenAA', '美国华人 OpenAA', 'OpenAA 美国华人生活入口'],
    url: HOME_CANONICAL,
    description: '美国华人生活入口，提供华人招聘、房屋、二手市场、DMV、本地服务、新闻资讯和实用导航。',
  },
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'OpenAA',
    alternateName: ['华人 OpenAA', '美国华人 OpenAA', 'OpenAA 美国华人生活入口'],
    url: HOME_CANONICAL,
    description: '美国华人生活入口，提供华人招聘、房屋、二手市场、DMV、本地服务、新闻资讯和实用导航。',
  },
]

export default function HomePage() {
  return (
    <div className="bg-white">
      {/* JSON-LD (homepage only; keep invisible and non-intrusive) */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />

      <AppTopSection bannerPosition="home" />

      {/* 8-grid quick-access menu — sits on a zinc-50 band */}
      <GridMenu />

      {/* DMV + exchange rate info cards */}
      <InfoCardsSection />

      {/* Latest posts */}
      <LatestPostsSection />

      {/* Lightweight SEO copy (kept near bottom; does not change above-the-fold UI) */}
      <section className="px-4 pb-6">
        <div className="rounded-3xl bg-zinc-50 ring-1 ring-zinc-100 p-4 text-[12.5px] leading-relaxed text-zinc-600">
          OpenAA 是一个为美国华人和美华人提供生活信息的中文平台，涵盖华人招聘、找工作、房屋租售、二手市场、本地服务、DMV 驾照信息、新闻资讯和实用导航。平台重点服务纽约及周边华人用户，也适合更多在美国生活的中文用户使用。
        </div>
      </section>

      <BackToTopButton />
    </div>
  )
}
