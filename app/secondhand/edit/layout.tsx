import type { Metadata } from 'next'

const NOINDEX_METADATA: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
      'max-video-preview': 0,
      'max-image-preview': 'none',
      'max-snippet': 0,
    },
  },
}

export const metadata = NOINDEX_METADATA

export default function SecondhandEditLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
