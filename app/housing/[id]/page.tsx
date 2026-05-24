import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import HousingDetailClient from './HousingDetailClient'
import { getPublicHousingById, incrementPublicHousingViews } from '@/lib/housing/publicHousing'
import { getSiteUrl } from '@/lib/site'

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function cleanDescription(value: unknown, fallback: string): string {
  const text = typeof value === 'string' ? value : ''
  const cleaned = text
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return (cleaned || fallback).slice(0, 150)
}

function getHousingSeoText(post: { title?: string | null; location?: string | null; description?: string | null }) {
  const title = post.title?.trim() || '房屋信息'
  const location = post.location?.trim() || '纽约'
  return {
    title: `${title}｜${location}房屋出租｜OpenAA 纽约站`,
    description: cleanDescription(post.description, `${title}，${location}房屋出租信息。OpenAA 纽约站华人生活信息平台。`),
  }
}

function firstImage(images: unknown): string | undefined {
  return Array.isArray(images) && typeof images[0] === 'string' && images[0] ? images[0] : undefined
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const supabase = getSupabaseClient()
  const { data } = await getPublicHousingById(supabase, id)

  if (!data) {
    return {
      title: '房屋信息不存在｜OpenAA 纽约站',
      description: '该房屋信息不存在或暂不可公开访问。',
    }
  }

  const seo = getHousingSeoText(data)
  const canonical = getSiteUrl(`/housing/${id}`)
  const image = firstImage(data.images)

  return {
    title: seo.title,
    description: seo.description,
    alternates: {
      canonical,
    },
    openGraph: {
      title: seo.title,
      description: seo.description,
      url: canonical,
      type: 'article',
      images: image ? [image] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: seo.title,
      description: seo.description,
      images: image ? [image] : undefined,
    },
  }
}

export default async function HousingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = getSupabaseClient()
  const { data } = await getPublicHousingById(supabase, id)

  if (!data) notFound()

  await incrementPublicHousingViews(supabase, id, data.views)

  return <HousingDetailClient post={data} />
}
