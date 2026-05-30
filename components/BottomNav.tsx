'use client'

import type { ComponentType } from 'react'
import type { LucideProps } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Briefcase, HomeIcon, User, Newspaper } from 'lucide-react'

type NavItem = {
  href: string
  label: string
  Icon: ComponentType<LucideProps>
  exact: boolean
}

const items: NavItem[] = [
  { href: '/', label: '首页', Icon: Home, exact: true },
  { href: '/jobs', label: '招聘', Icon: Briefcase, exact: false },
  { href: '/housing', label: '房屋', Icon: HomeIcon, exact: false },
  { href: '/news', label: '新闻', Icon: Newspaper, exact: false },
  { href: '/profile', label: '我的', Icon: User, exact: false },
]

export default function BottomNav() {
  const pathname = usePathname()

  const isActive = (href: string, exact: boolean) => {
    if (exact) return pathname === href
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[560px] md:max-w-[760px] lg:max-w-[960px] xl:max-w-[1040px] z-50 bg-white border-t border-zinc-100 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
      <div className="grid grid-cols-5 h-16 items-end pb-2">
        {items.map(({ href, label, Icon, exact }) => {
          const active = isActive(href, exact)
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center gap-0.5 py-1 transition-colors ${
                active ? 'text-blue-500' : 'text-zinc-600'
              }`}
            >
              <Icon size={22} strokeWidth={active ? 2 : 1.75} />
              <span className="text-[12.5px] font-medium leading-none">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
