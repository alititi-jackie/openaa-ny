'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { formatDate } from '@/lib/utils'
import PostSafetyNotice from '@/components/PostSafetyNotice'
import AdminReturnButton from '@/components/AdminReturnButton'
import DetailBackButton from '@/components/DetailBackButton'
import BackToTopButton from '@/components/BackToTopButton'
import ContactInfoCard from '@/components/ContactInfoCard'
import DetailShareCard from '@/components/DetailShareCard'
import ShareButton from '@/components/ShareButton'
import RecentViewRecorder from '@/components/RecentViewRecorder'
import FavoriteButton from '@/components/FavoriteButton'
import type { HousingPost } from '@/types'

const AUTO_INTERVAL_MS = 3500

function typeLabel(t?: string) {
  return t === 'seeking' ? '求租' : '出租'
}

function typeBadgeClass(t?: string) {
  return t === 'seeking'
    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'
    : 'bg-blue-50 text-blue-700 ring-1 ring-blue-100'
}

function displayPrice(p: number): string | null {
  const price = Number(p || 0)
  if (!Number.isFinite(price) || price <= 0) return null
  return `$${price} / 月`
}

export default function HousingDetailClient({ post }: { post: HousingPost }) {
  const [showContactInfo, setShowContactInfo] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const touchStartXRef = useRef<number | null>(null)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  const images = Array.isArray(post.images) ? (post.images as string[]).filter(Boolean) : []
  const imageCount = images.length
  const isAuto = imageCount >= 2

  const goTo = (idx: number) => {
    if (imageCount <= 0) return
    const next = ((idx % imageCount) + imageCount) % imageCount
    setActiveIndex(next)
  }

  const goPrev = () => goTo(activeIndex - 1)
  const goNext = () => goTo(activeIndex + 1)

  const stopAuto = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  const startAuto = () => {
    stopAuto()
    if (!isAuto) return
    intervalRef.current = setInterval(() => {
      setActiveIndex((p) => {
        const next = p + 1
        return next >= imageCount ? 0 : next
      })
    }, AUTO_INTERVAL_MS)
  }

  useEffect(() => {
    if (imageCount === 0) {
      setActiveIndex(0)
      stopAuto()
      return
    }
    setActiveIndex((p) => (p >= imageCount ? 0 : p))
    startAuto()
    return () => stopAuto()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageCount])

  useEffect(() => {
    if (lightboxOpen) stopAuto()
    else startAuto()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightboxOpen])

  const currentImage = imageCount > 0 ? images[activeIndex] : ''
  const rawPrice = Number(post.price || 0)
  const hasPrice = Number.isFinite(rawPrice) && rawPrice > 0
  const hasContactInfo = Boolean((post.contact_name || '').trim() || (post.phone || '').trim() || (post.wechat || '').trim())
  const publisherUsername = post.user?.username || '匿名用户'
  const publisherAvatarUrl = post.user?.avatar_url || ''

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 pb-24">
      <RecentViewRecorder
        item={{
          type: 'housing',
          id: String(post.id),
          title: post.title,
          url: `/housing/${String(post.id)}`,
          imageUrl: images[0],
          summary: `${post.type === 'seeking' ? '求租' : '出租'} · ${post.location || ''}${hasPrice ? ` · $${rawPrice}/月` : ''}`,
        }}
      />
      <AdminReturnButton />
      <div className="flex items-center justify-between">
        <DetailBackButton fallbackHref="/housing" inToolbar />
        <div className="flex items-center gap-2">
          <FavoriteButton
            targetType="housing"
            targetId={post.id}
            targetUrl={`/housing/${String(post.id)}`}
            title={post.title}
            imageUrl={images[0]}
            summary={`${post.type === 'seeking' ? '求租' : '出租'} · ${post.location || ''}${hasPrice ? ` · $${rawPrice}/月` : ''}`}
          />
          <ShareButton
            path={`/housing/${String(post.id)}`}
            title={post.title}
            text={`${post.type === 'seeking' ? '求租' : '出租'} · ${post.location || ''}${hasPrice ? ` · $${rawPrice}/月` : ''}`}
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {imageCount > 0 ? (
          <div
            className="relative h-64 md:h-96 overflow-hidden bg-zinc-100"
            onMouseEnter={stopAuto}
            onMouseLeave={startAuto}
            onTouchStart={(e) => {
              touchStartXRef.current = e.touches?.[0]?.clientX ?? null
              stopAuto()
            }}
            onTouchEnd={(e) => {
              const startX = touchStartXRef.current
              const endX = e.changedTouches?.[0]?.clientX ?? null
              touchStartXRef.current = null
              if (startX != null && endX != null) {
                const dx = endX - startX
                if (Math.abs(dx) > 35) {
                  if (dx > 0) goPrev()
                  else goNext()
                } else {
                  setLightboxOpen(true)
                }
              } else {
                setLightboxOpen(true)
              }
              startAuto()
            }}
          >
            <button
              type="button"
              onClick={() => setLightboxOpen(true)}
              className="block h-full w-full"
              aria-label="查看大图"
            >
              <Image
                key={currentImage}
                src={currentImage}
                alt={post.title}
                fill
                priority
                className="object-contain object-center"
              />
            </button>

            {imageCount >= 2 && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    stopAuto()
                    goPrev()
                    startAuto()
                  }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-black/45 text-white flex items-center justify-center hover:bg-black/55"
                  aria-label="上一张"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={() => {
                    stopAuto()
                    goNext()
                    startAuto()
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-black/45 text-white flex items-center justify-center hover:bg-black/55"
                  aria-label="下一张"
                >
                  ›
                </button>
              </>
            )}

            {imageCount >= 2 && (
              <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-2">
                {images.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      stopAuto()
                      goTo(idx)
                      startAuto()
                    }}
                    className={
                      'h-2 w-2 rounded-full transition ' +
                      (idx === activeIndex ? 'bg-white' : 'bg-white/50 hover:bg-white/70')
                    }
                    aria-label={`切换到第 ${idx + 1} 张`}
                  />
                ))}
              </div>
            )}
          </div>
        ) : null}

        <div className="p-6">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className={`text-xs px-2 py-0.5 rounded-full ${typeBadgeClass(post.type)}`}>
              {typeLabel(post.type)}
            </span>
            {post.room_type ? (
              <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-50 text-zinc-600 ring-1 ring-zinc-100">
                {post.room_type}
              </span>
            ) : null}
          </div>

          <h1 className="text-xl font-semibold text-gray-900">{post.title}</h1>

          {hasPrice && (
            <p className="text-2xl font-bold text-[#1976d2] mt-2">{displayPrice(post.price)}</p>
          )}

          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-sm text-gray-500">
            {post.location ? <span>📍 {post.location}</span> : null}
            <span>🕒 {formatDate(post.created_at)}</span>
          </div>

          {post.description ? (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <h2 className="font-semibold text-gray-900 mb-2">房屋描述</h2>
              <p className="text-gray-600 whitespace-pre-wrap">{post.description}</p>

              <PostSafetyNotice variant="contact" />
            </div>
          ) : null}

          {hasContactInfo ? (
            <div className="mt-4 pt-4 border-t border-gray-100">
              {showContactInfo ? (
                <ContactInfoCard
                  title="联系发布者"
                  contactName={post.contact_name}
                  phone={post.phone}
                  wechat={post.wechat}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setShowContactInfo(true)}
                  className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4 text-center text-base font-medium text-blue-600"
                >
                  查看联系方式
                </button>
              )}
            </div>
          ) : null}

          <DetailShareCard
            path={`/housing/${String(post.id)}`}
            title={post.title}
            text={`${post.type === 'seeking' ? '求租' : '出租'} · ${post.location || ''}${hasPrice ? ` · $${rawPrice}/月` : ''}`}
          />

          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-3">
            {publisherAvatarUrl ? (
              <Image
                src={publisherAvatarUrl}
                alt={publisherUsername}
                width={40}
                height={40}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[#1976d2] flex items-center justify-center text-white font-bold">
                {publisherUsername?.[0]?.toUpperCase() ?? '?'}
              </div>
            )}
            <div>
              <p className="font-medium text-gray-900">{publisherUsername}</p>
              <p className="text-xs text-gray-500">发布者</p>
            </div>
          </div>

          <PostSafetyNotice variant="safety" />
        </div>
      </div>

      {lightboxOpen && imageCount > 0 && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setLightboxOpen(false)}
        >
          <div className="relative w-full max-w-5xl h-[80vh]" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setLightboxOpen(false)}
              className="absolute top-2 left-2 z-10 px-3 py-2 rounded-full bg-black/60 text-white text-sm"
              aria-label="返回"
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

            <Image src={currentImage} alt={post.title} fill className="object-contain" />

            {imageCount >= 2 && (
              <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-2 z-10">
                {images.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => goTo(idx)}
                    className={
                      'h-2.5 w-2.5 rounded-full transition ' +
                      (idx === activeIndex ? 'bg-white' : 'bg-white/50 hover:bg-white/70')
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
