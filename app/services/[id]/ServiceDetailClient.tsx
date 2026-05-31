'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import PostSafetyNotice from '@/components/PostSafetyNotice'
import AdminReturnButton from '@/components/AdminReturnButton'
import DetailBackButton from '@/components/DetailBackButton'
import BackToTopButton from '@/components/BackToTopButton'
import DetailShareCard from '@/components/DetailShareCard'
import ShareButton from '@/components/ShareButton'
import RecentViewRecorder from '@/components/RecentViewRecorder'
import FavoriteButton from '@/components/FavoriteButton'
import type { ServicePost } from '@/types'

function formatDate(s: string | null) {
  if (!s) return ''
  try {
    return new Date(s).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  } catch {
    return s
  }
}

const SERVICE_DETAIL_IMAGE_SIZES = '(min-width: 768px) 672px, 100vw'
const SERVICE_LIGHTBOX_IMAGE_SIZES = '(min-width: 1024px) 1024px, 100vw'

function canUseNextImage(src: string) {
  if (src.startsWith('/')) return true
  try {
    const hostname = new URL(src).hostname
    return (
      hostname === 'img.openaa.com' ||
      hostname.endsWith('.supabase.co') ||
      hostname.endsWith('.googleusercontent.com')
    )
  } catch {
    return false
  }
}

export default function ServiceDetailClient({ post }: { post: ServicePost | null }) {
  const [imgIdx, setImgIdx] = useState(0)
  const [copied, setCopied] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  const images = post?.images?.filter(Boolean) ?? []
  const imageCount = images.length

  const goPrev = () => setImgIdx((i) => (i - 1 + imageCount) % imageCount)
  const goNext = () => setImgIdx((i) => (i + 1) % imageCount)

  // Close lightbox on ESC; navigate with arrow keys
  useEffect(() => {
    if (!lightboxOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxOpen(false)
      if (imageCount >= 2) {
        if (e.key === 'ArrowLeft') goPrev()
        if (e.key === 'ArrowRight') goNext()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightboxOpen, imageCount])

  if (!post) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4 py-20 text-center">
        <div className="text-4xl mb-3">🔍</div>
        <p className="text-gray-700 font-medium">信息不存在或已被删除</p>
        <Link
          href="/services"
          className="mt-4 inline-block text-[#1976d2] text-sm font-medium hover:underline"
        >
          ← 返回本地服务
        </Link>
      </div>
    )
  }

  const hasImages = imageCount > 0

  const handleCopyWechat = async () => {
    if (!post.wechat) return
    try {
      await navigator.clipboard.writeText(post.wechat)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback: nothing
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
      <RecentViewRecorder
        item={{
          type: 'services',
          id: post.id,
          title: post.title,
          url: `/services/${post.id}`,
          imageUrl: images[0],
          summary: `${post.category} · ${post.location}`,
        }}
      />
      <AdminReturnButton />
      {/* Back button */}
      <div className="flex items-center justify-between">
        <DetailBackButton fallbackHref="/services" inToolbar />
        <div className="flex items-center gap-2">
          <FavoriteButton
            targetType="services"
            targetId={post.id}
            targetUrl={`/services/${post.id}`}
            title={post.title}
            imageUrl={images[0]}
            summary={`${post.category} · ${post.location}`}
          />
          <ShareButton
            path={`/services/${post.id}`}
            title={post.title}
            text={`${post.category} · ${post.location}`}
          />
        </div>
      </div>

      {/* Image carousel */}
      {hasImages && (
        <div className="relative h-64 md:h-80 mb-4 rounded-2xl overflow-hidden bg-zinc-100">
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            className="block w-full h-full"
            aria-label="查看大图"
          >
            {canUseNextImage(images[imgIdx]) ? (
              <Image
                key={images[imgIdx]}
                src={images[imgIdx]}
                alt={`${post.title} 图片 ${imgIdx + 1}`}
                fill
                sizes={SERVICE_DETAIL_IMAGE_SIZES}
                className="object-contain object-center"
                priority
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={images[imgIdx]}
                alt={`${post.title} 图片 ${imgIdx + 1}`}
                className="h-full w-full object-contain object-center"
              />
            )}
          </button>
          {imageCount > 1 && (
            <>
              <button
                type="button"
                onClick={goPrev}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center text-sm"
                aria-label="上一张"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={goNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center text-sm"
                aria-label="下一张"
              >
                ›
              </button>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                {images.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setImgIdx(i)}
                    className={`w-1.5 h-1.5 rounded-full transition ${i === imgIdx ? 'bg-white' : 'bg-white/50'}`}
                    aria-label={`图片 ${i + 1}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Title & meta */}
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-900 leading-snug">{post.title}</h1>
        <div className="mt-2 flex flex-wrap gap-2 text-sm text-gray-500">
          <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">
            {post.category}
          </span>
          <span className="text-gray-500">📍 {post.location}</span>
          <span className="text-gray-400">{formatDate(post.created_at)}</span>
        </div>
      </div>

      {/* Description */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-2">服务介绍</h2>
        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{post.description}</p>

        <PostSafetyNotice variant="contact" />
      </div>

      {/* Price note */}
      {post.price_note ? (
        <div className="bg-blue-50 rounded-2xl border border-blue-100 p-4 mb-4">
          <h2 className="text-sm font-semibold text-blue-800 mb-1">价格说明</h2>
          <p className="text-sm text-blue-700">{post.price_note}</p>
        </div>
      ) : null}

      {/* Contact */}
      {(post.contact_name || post.phone || post.wechat) ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">联系服务方</h2>
          <div className="space-y-1.5 text-sm text-gray-700 mb-4">
            {post.contact_name ? (
              <p>联系人：{post.contact_name}</p>
            ) : null}
            {post.phone ? <p>电话：{post.phone}</p> : null}
            {post.wechat ? <p>微信：{post.wechat}</p> : null}
          </div>
          <div className="flex flex-wrap gap-3">
            {post.phone ? (
              <a
                href={`tel:${post.phone}`}
                className="flex-1 min-w-[120px] text-center bg-[#1976d2] text-white py-2.5 rounded-xl text-sm font-medium hover:bg-[#1565c0] transition"
              >
                📞 拨打电话
              </a>
            ) : null}
            {post.wechat ? (
              <button
                type="button"
                onClick={handleCopyWechat}
                className="flex-1 min-w-[120px] text-center bg-emerald-500 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-emerald-600 transition"
              >
                {copied ? '✅ 已复制' : '💬 复制微信号'}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <DetailShareCard
        path={`/services/${post.id}`}
        title={post.title}
        text={`${post.category} · ${post.location}`}
        className="mb-4"
      />

      {/* Safety notice */}
      <PostSafetyNotice />

      {/* Report link */}
      <div className="mt-4 text-center">
        <Link
          href="mailto:323748@gmail.com?subject=OpenAA本地服务信息投诉举报"
          className="text-xs text-gray-400 hover:text-gray-600 underline"
        >
          投诉举报此信息
        </Link>
      </div>

      {/* Lightbox */}
      {lightboxOpen && imageCount > 0 && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="图片预览"
          onClick={() => setLightboxOpen(false)}
        >
          <div className="relative w-full max-w-5xl h-[80vh]" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setLightboxOpen(false)}
              className="absolute top-2 left-2 z-10 px-3 py-2 rounded-full bg-black/60 text-white text-sm"
              aria-label="关闭图片预览"
            >
              ← 返回
            </button>

            {imageCount >= 2 && (
              <>
                <button
                  type="button"
                  onClick={goPrev}
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-black/55 text-white flex items-center justify-center"
                  aria-label="上一张"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-black/55 text-white flex items-center justify-center"
                  aria-label="下一张"
                >
                  ›
                </button>
              </>
            )}

            {canUseNextImage(images[imgIdx]) ? (
              <Image
                key={images[imgIdx]}
                src={images[imgIdx]}
                alt={`${post.title} 图片 ${imgIdx + 1}`}
                fill
                sizes={SERVICE_LIGHTBOX_IMAGE_SIZES}
                className="object-contain"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={images[imgIdx]}
                alt={`${post.title} 图片 ${imgIdx + 1}`}
                className="absolute inset-0 h-full w-full object-contain"
              />
            )}

            {imageCount >= 2 && (
              <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-2 z-10">
                {images.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setImgIdx(idx)}
                    className={
                      'h-2.5 w-2.5 rounded-full transition ' +
                      (idx === imgIdx ? 'bg-white' : 'bg-white/50 hover:bg-white/70')
                    }
                    aria-label={`切换到第 ${idx + 1} 张`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      <BackToTopButton />
    </div>
  )
}
