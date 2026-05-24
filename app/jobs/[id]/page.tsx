import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import JobDetailClient from './JobDetailClient'
import { getPublicJobById, incrementPublicJobViews } from '@/lib/jobs/publicJobs'
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

function getJobSeoText(job: { title?: string | null; location?: string | null; description?: string | null }) {
  const title = job.title?.trim() || '招聘信息'
  const location = job.location?.trim() || '纽约'
  return {
    title: `${title}｜${location}招聘｜OpenAA 纽约站`,
    description: cleanDescription(job.description, `${title}，${location}招聘信息。OpenAA 纽约站华人生活信息平台。`),
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const supabase = getSupabaseClient()
  const { data } = await getPublicJobById(supabase, id)

  if (!data) {
    return {
      title: '招聘信息不存在｜OpenAA 纽约站',
      description: '该招聘信息不存在或暂不可公开访问。',
    }
  }

  const seo = getJobSeoText(data)
  const canonical = getSiteUrl(`/jobs/${id}`)

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
    },
    twitter: {
      card: 'summary_large_image',
      title: seo.title,
      description: seo.description,
    },
  }
}

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = getSupabaseClient()
  const { data } = await getPublicJobById(supabase, id)

  if (!data) notFound()

  await incrementPublicJobViews(supabase, id, data.views)

  return <JobDetailClient job={data} />
}
