import type { Metadata, Viewport } from 'next'
import './globals.css'
import Header from '@/components/Header'
import BottomNav from '@/components/BottomNav'
import { SITE_URL } from '@/lib/site'

export const metadata: Metadata = {
  title: 'OpenAA – 纽约站 – 华人生活圈',
  description: '纽约华人综合服务平台 — 招聘·房屋·二手·DMV·新闻',
  metadataBase: new URL(SITE_URL),
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/favicon/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: { url: '/favicon/apple-touch-icon.png', sizes: '180x180' },
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#ffffff',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body className="bg-zinc-200 antialiased">
        <div className="mx-auto max-w-[560px] md:max-w-[760px] lg:max-w-[960px] xl:max-w-[1040px] min-h-screen bg-white relative shadow-[0_0_80px_rgba(0,0,0,0.10)]">
          <Header />
          <main className="pt-14 pb-20">{children}</main>
          <BottomNav />
        </div>
      </body>
    </html>
  )
}
