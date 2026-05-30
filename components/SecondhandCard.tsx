import Link from 'next/link'
import Image from 'next/image'
import { formatPrice, formatDate } from '@/lib/utils'
import type { SecondhandItem } from '@/types'

interface Props {
  item: SecondhandItem
}

function toSortableTime(value: string | null | undefined): number {
  if (!value) return 0
  const time = new Date(value).getTime()
  return Number.isNaN(time) ? 0 : time
}

function isEffectivePinned(item: SecondhandItem, nowTime: number): boolean {
  if (!item.is_pinned) return false
  if (item.status !== 'published') return false
  if (!item.pinned_until) return true
  return toSortableTime(item.pinned_until) > nowTime
}

function parseBudget(description: string): string | null {
  const lines = (description || '').split('\n')
  for (const line of lines) {
    // Expect: 预算范围：...
    const m = line.match(/^预算范围[:：]\s*(.+)\s*$/)
    if (m && m[1]) return m[1].trim()
  }
  return null
}

function hasVisiblePrice(price: number | null | undefined): price is number {
  return typeof price === 'number' && Number.isFinite(price) && price > 0
}

export default function SecondhandCard({ item }: Props) {
  const isBuying = item.type === 'buying'
  const budget = isBuying ? parseBudget(item.description) : null
  const priceOrBudget = isBuying
    ? `预算：${budget || '面议'}`
    : (hasVisiblePrice(item.price) ? formatPrice(item.price) : null)
  const isPinned = isEffectivePinned(item, Date.now())

  return (
    <Link href={`/secondhand/${item.id}`}>
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition cursor-pointer">
        <div className="relative h-48 bg-gray-100">
          {item.images && item.images.length > 0 ? (
            <Image src={item.images[0]} alt={item.title} fill className="object-cover" />
          ) : (
            <div className="flex items-center justify-center h-full text-4xl">🛍️</div>
          )}

          {isBuying && (
            <div className="absolute top-2 left-2">
              <span className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded font-semibold">
                求购
              </span>
            </div>
          )}
        </div>
        <div className="p-3">
          {priceOrBudget ? <p className="font-semibold text-lg text-[#1976d2]">{priceOrBudget}</p> : null}
          <h3 className="text-gray-900 font-medium line-clamp-2 mt-1">{item.title}</h3>
          {item.description ? (
            <p className="mt-1 text-sm text-gray-600 line-clamp-2">{item.description}</p>
          ) : null}
          <div className="flex items-center justify-between mt-2 gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              {isPinned ? (
                <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 border border-amber-100">
                  置顶
                </span>
              ) : null}
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                {item.category}
              </span>
            </div>
            <span className="text-xs text-gray-400">{formatDate(item.created_at)}</span>
          </div>
        </div>
      </div>
    </Link>
  )
}
