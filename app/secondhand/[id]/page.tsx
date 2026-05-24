import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import SecondhandDetailClient from './SecondhandDetailClient'
import {
  getPublicSecondhandById,
  incrementPublicSecondhandViews,
} from '@/lib/secondhand/publicSecondhand'
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

function getItemRegion(item: { location?: string | null; description?: string | null }): string {
  const location = typeof item.location === 'string' ? item.location.trim() : ''
  if (location) return location

  const lines = (item.description || '').split('\n')
  for (const line of lines) {
    const m = line.match(/^所在地区[:：]\s*(.+)\s*$/)
    const value = m?.[1]?.trim()
    if (value) return value
  }

  return '纽约'
}

function getSecondhandSeoText(item: { title?: string | null; location?: string | null; description?: string | null }) {
  const title = item.title?.trim() || '二手交易'
  const location = getItemRegion(item)
  return {
    title: `${title}｜${location}二手交易｜OpenAA 纽约站`,
    description: cleanDescription(item.description, `${title}，${location}二手交易信息。OpenAA 纽约站华人生活信息平台。`),
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
  const { data } = await getPublicSecondhandById(supabase, id)

  if (!data) {
    return {
      title: '二手信息不存在｜OpenAA 纽约站',
      description: '该二手信息不存在或暂不可公开访问。',
    }
  }

  const seo = getSecondhandSeoText(data)
  const canonical = getSiteUrl(`/secondhand/${id}`)
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

export default async function SecondhandDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = getSupabaseClient()
  const { data } = await getPublicSecondhandById(supabase, id)

  if (!data) notFound()

  await incrementPublicSecondhandViews(supabase, id, data.views)

  return <SecondhandDetailClient item={data} />
}
