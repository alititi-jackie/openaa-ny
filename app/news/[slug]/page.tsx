import { Suspense } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import NewsCover from '@/components/NewsCover'
import OpenAAAttractCard from '@/components/OpenAAAttractCard'
import AdminReturnButton from '@/components/AdminReturnButton'
import DetailBackButton from '@/components/DetailBackButton'
import BackToTopButton from '@/components/BackToTopButton'
import NewsTipCard from '@/components/NewsTipCard'
import DetailShareCard from '@/components/DetailShareCard'
import ShareButton from '@/components/ShareButton'
import RecentViewRecorder from '@/components/RecentViewRecorder'
import FavoriteButton from '@/components/FavoriteButton'
import { NEWS_DEFAULT_SEO_DESCRIPTION } from '@/lib/news'
import { getSiteUrl } from '@/lib/site'
import type { NewsPost } from '@/types'

type NewsNavPost = Pick<NewsPost, 'id' | 'slug' | 'title' | 'published_at' | 'created_at' | 'category'>
type NewsRelatedPost = Pick<
  NewsPost,
  'id' | 'slug' | 'title' | 'summary' | 'published_at' | 'created_at' | 'category'
>

function getSupabaseClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
}

async function getNewsBySlug(slug: string) {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('news_posts')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .single()

  if (error || !data) return null
  return data as NewsPost
}

async function getNewsDetailContext(slug: string) {
  const supabase = getSupabaseClient()
  const post = await getNewsBySlug(slug)

  if (!post) return null

  const { data: orderedPosts } = await supabase
    .from('news_posts')
    .select('id, slug, title, published_at, created_at, category')
    .eq('is_published', true)
    .order('published_at', { ascending: false })
    .order('created_at', { ascending: false })

  const ordered = ((orderedPosts as NewsNavPost[] | null) || []).filter((item) => item.slug !== slug)
  const currentIndex = ((orderedPosts as NewsNavPost[] | null) || []).findIndex((item) => item.slug === slug)
  const previousPost = currentIndex > 0 ? (orderedPosts as NewsNavPost[])[currentIndex - 1] : null
  const nextPost =
    currentIndex >= 0 && orderedPosts && currentIndex < orderedPosts.length - 1
      ? (orderedPosts as NewsNavPost[])[currentIndex + 1]
      : null

  const { data: sameCategory } = await supabase
    .from('news_posts')
    .select('id, slug, title, summary, published_at, created_at, category')
    .eq('is_published', true)
    .eq('category', post.category)
    .neq('slug', slug)
    .order('published_at', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(3)

  const relatedPosts: NewsRelatedPost[] = (sameCategory as NewsRelatedPost[] | null) || []

  if (relatedPosts.length < 3) {
    const relatedSlugSet = new Set(relatedPosts.map((related) => related.slug))
    const fallback = ordered
      .filter((item) => !relatedSlugSet.has(item.slug))
      .slice(0, 3 - relatedPosts.length)
    relatedPosts.push(
      ...fallback.map((item) => ({
        ...item,
        summary: null,
      }))
    )
  }

  return {
    post,
    previousPost,
    nextPost,
    relatedPosts,
  }
}

function formatDate(value: string | null) {
  if (!value) return ''
  try {
    return new Date(value).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  } catch {
    return value
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const post = await getNewsBySlug(slug)

  if (!post) {
    return {
      title: '新闻详情 - OpenAA',
      description: NEWS_DEFAULT_SEO_DESCRIPTION,
    }
  }

  const title = post.seo_title || `${post.title} - OpenAA`
  const description = post.seo_description || post.summary || NEWS_DEFAULT_SEO_DESCRIPTION
  const image = post.cover_image_url ? [post.cover_image_url] : undefined

  return {
    title,
    description,
    alternates: {
      canonical: getSiteUrl(`/news/${slug}`),
    },
    openGraph: {
      title,
      description,
      images: image,
    },
  }
}

export default async function NewsDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const context = await getNewsDetailContext(slug)

  if (!context) {
    notFound()
  }

  const { post, previousPost, nextPost, relatedPosts } = context
  const paragraphs = post.content
    .split(/\n+/)
    .map((part) => part.trim())
    .filter(Boolean)
  const publishedSource = post.published_at || post.created_at
  const modifiedSource = post.updated_at && post.updated_at !== publishedSource ? post.updated_at : null
  const canonicalUrl = getSiteUrl(`/news/${post.slug}`)
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: post.title,
    description: post.seo_description || post.summary || NEWS_DEFAULT_SEO_DESCRIPTION,
    datePublished: publishedSource,
    dateModified: post.updated_at || publishedSource,
    articleSection: post.category,
    mainEntityOfPage: canonicalUrl,
    url: canonicalUrl,
    image: post.cover_image_url ? [post.cover_image_url] : undefined,
    publisher: {
      '@type': 'Organization',
      name: 'OpenAA',
      url: getSiteUrl('/'),
    },
  }

  return (
    <div className="min-h-screen bg-white pb-24">
      <RecentViewRecorder
        item={{
          type: 'news',
          id: post.slug,
          title: post.title,
          url: `/news/${post.slug}`,
          imageUrl: post.cover_image_url || undefined,
          summary: post.summary || post.category,
        }}
      />
      <div className="px-4 pt-5">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />

        <Suspense fallback={null}>
          <AdminReturnButton />
        </Suspense>
        <div className="flex items-center justify-between">
          <DetailBackButton fallbackHref="/news" label="← 返回" inToolbar />
          <div className="flex items-center gap-2">
            <FavoriteButton
              targetType="news"
              targetId={post.id}
              targetUrl={`/news/${post.slug}`}
              title={post.title}
              imageUrl={post.cover_image_url || undefined}
              summary={post.summary || post.category}
            />
            <ShareButton
              path={`/news/${post.slug}`}
              title={post.title}
              text={post.summary || post.title}
            />
          </div>
        </div>

        <p className="mt-2 inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
          {post.category}
        </p>
        <h1 className="mt-2 text-2xl font-black leading-tight text-zinc-900">{post.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-zinc-400">
          <p>发布时间：{formatDate(publishedSource)}</p>
          <p>更新时间：{modifiedSource ? formatDate(modifiedSource) : '暂无更新'}</p>
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-100">
          <NewsCover src={post.cover_image_url} alt={post.title} className="h-52 w-full" />
        </div>

        <article className="mt-5 space-y-4 text-[15px] leading-7 text-zinc-800">
          {paragraphs.map((paragraph, index) => (
            <p key={`${post.id}-${index}`}>{paragraph}</p>
          ))}
        </article>

        <DetailShareCard
          path={`/news/${post.slug}`}
          title={post.title}
          text={post.summary || post.title}
          className="mt-6"
        />

        <NewsTipCard />

        {previousPost || nextPost ? (
          <div className="mt-7 rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm">
            <h2 className="text-base font-bold text-zinc-900">继续阅读</h2>
            <div className="mt-3 space-y-2">
              {previousPost ? (
                <Link
                  href={`/news/${previousPost.slug}`}
                  className="block rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2 text-sm text-zinc-700 transition hover:bg-zinc-100"
                >
                  <span className="text-zinc-500">上一篇：</span>
                  {previousPost.title}
                </Link>
              ) : null}
              {nextPost ? (
                <Link
                  href={`/news/${nextPost.slug}`}
                  className="block rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2 text-sm text-zinc-700 transition hover:bg-zinc-100"
                >
                  <span className="text-zinc-500">下一篇：</span>
                  {nextPost.title}
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}

        {relatedPosts.length > 0 ? (
          <div className="mt-4 rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm">
            <h2 className="text-base font-bold text-zinc-900">相关阅读</h2>
            <div className="mt-3 space-y-3">
              {relatedPosts.map((related) => (
                <Link
                  key={related.id}
                  href={`/news/${related.slug}`}
                  className="block rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2 transition hover:bg-zinc-100"
                >
                  <p className="text-xs font-medium text-blue-600">{related.category}</p>
                  <h3 className="mt-1 text-sm font-semibold text-zinc-900">{related.title}</h3>
                  {related.summary ? (
                    <p className="mt-1 text-xs text-zinc-600 line-clamp-2">{related.summary}</p>
                  ) : null}
                  <p className="mt-2 text-xs text-zinc-400">
                    {formatDate(related.published_at || related.created_at)}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-6">
          <OpenAAAttractCard />
        </div>
      </div>
      <BackToTopButton />
    </div>
  )
}
