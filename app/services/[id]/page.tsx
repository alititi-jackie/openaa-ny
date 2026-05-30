import { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import ServiceDetailClient from './ServiceDetailClient'
import { getPublicServiceById } from '@/lib/services/publicServices'
import { getSiteUrl } from '@/lib/site'
import type { ServicePost } from '@/types'

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
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
  const { data } = await getPublicServiceById(supabase, id)

  if (!data) {
    return {
      title: '本地服务详情 | OpenAA',
      description: 'OpenAA 华人本地服务信息',
    }
  }

  const title = `${data.title} - ${data.location}华人本地服务 | OpenAA`
  const description = `查看 ${data.location} ${data.title}，服务分类：${data.category}。OpenAA 华人本地服务信息由用户发布，请自行核实信息。`
  const canonical = getSiteUrl(`/services/${id}`)
  const image = firstImage(data.images)

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description,
      url: canonical,
      type: 'article',
      siteName: 'OpenAA',
      images: image ? [image] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: image ? [image] : undefined,
    },
  }
}

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = getSupabaseClient()
  const { data } = await getPublicServiceById(supabase, id)

  if (!data) {
    return <ServiceDetailClient post={null} />
  }

  return <ServiceDetailClient post={data as ServicePost} />
}
