'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import PostSafetyNotice from '@/components/PostSafetyNotice'
import AdminReturnButton from '@/components/AdminReturnButton'
import DetailBackButton from '@/components/DetailBackButton'
import BackToTopButton from '@/components/BackToTopButton'
import ContactInfoCard from '@/components/ContactInfoCard'
import DetailShareCard from '@/components/DetailShareCard'
import ShareButton from '@/components/ShareButton'
import { formatPrice, formatDate } from '@/lib/utils'
import type { SecondhandItem } from '@/types'

function parseBudget(description: string): string | null {
  const lines = (description || '').split('\n')
  for (const line of lines) {
    const m = line.match(/^预算范围[:：]\s*(.+)\s*$/)
    if (m && m[1]) return m[1].trim()
  }
  return null
}

const AUTO_INTERVAL_MS = 3500

function hasVisiblePrice(price: number | null | undefined): price is number {
  return typeof price === 'number' && Number.isFinite(price) && price > 0
}

export default function SecondhandDetailClient({ item }: { item: SecondhandItem }) {
  const [showContactInfo, setShowContactInfo] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const touchStartXRef = useRef<number | null>(null)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  const images = Array.isArray(item.images) ? item.images.filter(Boolean) : []
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
  }, [lightboxOpen, imageCount, activeIndex])

  const isBuying = item.type === 'buying'
  const budget = isBuying ? parseBudget(item.description) : null
  const sellingPrice = hasVisiblePrice(item.price) ? formatPrice(item.price) : null
  const hasContactInfo = Boolean((item.contact_name || '').trim() || (item.phone || '').trim() || (item.wechat || '').trim())
  const currentImage = imageCount > 0 ? images[activeIndex] : ''

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 pb-24">
      <AdminReturnButton />
      <div className="flex items-center justify-between">
        <DetailBackButton fallbackHref="/secondhand" inToolbar />
        <ShareButton
          path={`/secondhand/${String(item.id)}`}
          title={item.title}
          text={`${item.category}${isBuying ? ` · 预算：${budget || '面议'}` : sellingPrice ? ` · ${sellingPrice}` : ''}`}
        />
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
                alt={item.title}
                fill
                priority
                className="object-contain object-center"
              />
            </button>

            {isBuying && (
              <div className="absolute top-3 left-3">
                <span className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded font-semibold">求购</span>
              </div>
            )}

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
        ) : (
          <div className="h-64 bg-gray-100 flex items-center justify-center text-6xl">🛍️</div>
        )}

        <div className="p-6">
          {isBuying ? (
            <p className="text-2xl font-bold text-[#1976d2]">{`预算：${budget || '面议'}`}</p>
          ) : sellingPrice ? (
            <p className="text-2xl font-bold text-[#1976d2]">{sellingPrice}</p>
          ) : null}
          <h1 className="text-xl font-semibold text-gray-900 mt-2">{item.title}</h1>

          <div className="flex items-center gap-3 mt-3 text-sm text-gray-500">
            <span className="bg-gray-100 px-2 py-1 rounded">{item.category}</span>
            <span>👁 {item.views || 0} 次浏览</span>
            <span>{formatDate(item.created_at)}</span>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100">
            <h2 className="font-semibold text-gray-900 mb-2">商品描述</h2>
            <p className="text-gray-600 whitespace-pre-wrap">{item.description}</p>

            <PostSafetyNotice variant="contact" />
          </div>

          {hasContactInfo ? (
            <div className="mt-4 pt-4 border-t border-gray-100">
              {showContactInfo ? (
                <ContactInfoCard
                  title="联系卖家"
                  contactName={item.contact_name}
                  phone={item.phone}
                  wechat={item.wechat}
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
            path={`/secondhand/${String(item.id)}`}
            title={item.title}
            text={`${item.category}${isBuying ? ` · 预算：${budget || '面议'}` : sellingPrice ? ` · ${sellingPrice}` : ''}`}
          />

          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#1976d2] flex items-center justify-center text-white font-bold">
              {item.user?.username?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div>
              <p className="font-medium text-gray-900">{item.user?.username ?? '匿名用户'}</p>
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
          <div
            className="relative w-full max-w-5xl h-[80vh]"
            onClick={(e) => e.stopPropagation()}
          >
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

            <Image src={currentImage} alt={item.title} fill className="object-contain" />

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
