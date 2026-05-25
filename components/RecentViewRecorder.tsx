'use client'

import { useEffect } from 'react'
import { addRecentView, type RecentViewInput } from '@/lib/recentViews'

type RecentViewRecorderProps = {
  item: RecentViewInput
}

export default function RecentViewRecorder({ item }: RecentViewRecorderProps) {
  const { type, id, title, url, imageUrl, summary } = item

  useEffect(() => {
    addRecentView({ type, id, title, url, imageUrl, summary })
  }, [type, id, title, url, imageUrl, summary])

  return null
}
