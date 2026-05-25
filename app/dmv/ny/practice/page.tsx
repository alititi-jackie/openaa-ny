'use client'

import Link from 'next/link'
import { BookMarked, Shuffle, ClipboardList, AlertCircle, FileText } from 'lucide-react'
import AppTopSection from '@/components/AppTopSection'
import BackToTopButton from '@/components/BackToTopButton'
import DetailBackButton from '@/components/DetailBackButton'
import DetailShareCard from '@/components/DetailShareCard'
import ShareButton from '@/components/ShareButton'
import DmvPracticeEntryCards from '@/components/dmv/DmvPracticeEntryCards'
import ChannelSeoSection from '@/components/ChannelSeoSection'
import RecentViewRecorder from '@/components/RecentViewRecorder'
import { buildBreadcrumbSchema, buildFaqSchema, buildWebPageSchema } from '@/lib/seo'

const entryCards = [
  {
    title: '查看题库',
    desc: '按分类筛选与搜索，支持边看边做题。',
    href: '/dmv/ny/questions',
    Icon: BookMarked,
    colorClass: 'bg-blue-50 text-blue-600',
  },
  {
    title: '随机 / 顺序练习',
    desc: '全题库随机或顺序练习，答题后立即显示正确答案和解释。',
    href: '/dmv/ny/quiz',
    Icon: Shuffle,
    colorClass: 'bg-orange-50 text-orange-500',
  },
  {
    title: '模拟考试',
    desc: '按 DMV 规则出题，提交后立即看结果。',
    href: '/dmv/ny/mock-test',
    Icon: ClipboardList,
    colorClass: 'bg-green-50 text-green-600',
  },
  {
    title: '错题练习',
    desc: '自动汇总错题，集中练习薄弱题目。',
    href: '/dmv/ny/wrong-questions',
    Icon: AlertCircle,
    colorClass: 'bg-red-50 text-red-500',
  },
]

const pageTitle = '2026纽约驾照笔试中文练习 | NY DMV Permit 免费模拟考试 - OpenAA'
const pageDescription =
  '免费提供最新 2026 纽约州 NY DMV 中文 Permit 笔试练习，包含交通标志、道路规则、随机练习、顺序练习、错题练习与模拟考试。帮助纽约华人、新移民与留学生高效备考。'

const practiceFaq = [
  {
    question: '纽约 DMV Permit 要多少题及格？',
    answer: '纽约 DMV Permit 笔试共 20 题，至少答对 14 题，且交通标志题至少答对 2 题。',
  },
  {
    question: '纽约 DMV 可以考中文吗？',
    answer: '可以，纽约 DMV Permit 考试支持简体中文。',
  },
  {
    question: '纽约 Permit 通过后多久能预约路考？',
    answer: '通过 Permit 后需满足练车要求，再预约 Road Test。',
  },
]

export default function PracticeHomePage() {
  const webPageJsonLd = buildWebPageSchema({
    name: pageTitle,
    description: pageDescription,
    path: '/dmv/ny/practice',
  })
  const faqJsonLd = buildFaqSchema(practiceFaq)
  const breadcrumbJsonLd = buildBreadcrumbSchema([
    { name: '首页', path: '/' },
    { name: 'DMV', path: '/dmv' },
    { name: '纽约练习', path: '/dmv/ny/practice' },
  ])

  return (
    <div className="min-h-screen bg-zinc-50 pb-28">
      <RecentViewRecorder
        item={{
          type: 'dmv',
          id: 'dmv-ny-practice',
          title: '纽约 DMV Permit 中文练习系统',
          url: '/dmv/ny/practice',
          summary: '题库、随机练习、模拟考试和错题练习',
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <AppTopSection bannerPosition="dmv" />

      <div className="px-4 pt-4">
        <div className="mb-6 flex items-center justify-between">
          <DetailBackButton fallbackHref="/dmv" label="← 返回 DMV 首页" inToolbar forceHref />
          <ShareButton
            path="/dmv/ny/practice"
            title={pageTitle}
            text="支持中文 DMV 刷题、随机练习、模拟考试、错题练习。"
          />
        </div>

        <section className="rounded-2xl border border-blue-100 bg-gradient-to-b from-blue-50 to-white p-4 shadow-sm">
          <div>
            <h1 className="text-xl font-black text-zinc-900">2026 纽约 DMV Permit 中文练习系统</h1>
            <p className="mt-2 text-sm text-zinc-600 leading-relaxed">
              纽约 DMV Permit 笔试共 20 题，至少答对 14 题才能通过，其中交通标志题至少答对 2 题。OpenAA 提供免费的纽约 DMV 中文练习系统，适合纽约华人、新移民与留学生使用。
            </p>
          </div>
        </section>

        <DmvPracticeEntryCards cards={entryCards} />

        <DetailShareCard
          path="/dmv/ny/practice"
          title={pageTitle}
          text="支持中文 DMV 刷题、随机练习、模拟考试、错题练习。"
        />

        <section className="mt-4 rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm">
          <h2 className="text-base font-bold text-zinc-900">纽约 DMV 中文练习包含什么？</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-zinc-700">
            <li>交通标志练习</li>
            <li>Permit 道路规则</li>
            <li>错题练习</li>
            <li>模拟考试</li>
            <li>DMV 中文题库</li>
            <li>Permit 考试流程</li>
          </ul>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <Link href="/dmv/ny/mock-test" className="rounded-full bg-green-50 px-3 py-1.5 font-medium text-green-700">前往模拟考试</Link>
            <Link href="/dmv/ny/questions" className="rounded-full bg-blue-50 px-3 py-1.5 font-medium text-blue-700">查看完整题库</Link>
            <Link href="/dmv/ny/sign-test" className="rounded-full bg-orange-50 px-3 py-1.5 font-medium text-orange-700">交通标志专项</Link>
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <div className="flex items-start gap-2">
            <FileText size={16} className="mt-0.5 shrink-0 text-amber-700" />
            <div className="space-y-1 text-xs leading-5 text-amber-900">
              <p>OpenAA 只提供中文整理和入口导航。</p>
              <p>DMV 规则、费用、预约和罚单信息以官方页面为准。</p>
              <p>涉及法律、罚单争议、保险等问题，请咨询专业人士或官方机构。</p>
            </div>
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm">
          <h2 className="text-base font-bold text-zinc-900">常见问题 FAQ</h2>
          <div className="mt-3 space-y-3">
            {practiceFaq.map((item) => (
              <div key={item.question} className="rounded-xl border border-zinc-100 bg-zinc-50 p-3">
                <h3 className="text-sm font-semibold text-zinc-900">{item.question}</h3>
                <p className="mt-1 text-sm leading-relaxed text-zinc-600">{item.answer}</p>
              </div>
            ))}
          </div>
        </section>

        <ChannelSeoSection
          title="DMV Permit 中文练习与模拟考试说明"
          paragraphs={[
            '这个页面是 OpenAA 的纽约 DMV Permit 训练入口，围绕 DMV Permit 题库、DMV 中文笔试、模拟考试、交通标志、Learner Permit 等核心主题设计。许多用户会先搜索“Permit 中文练习”或“纽约 DMV 中文笔试”，再进入练习系统，因此底部保留了完整文字说明，让搜索引擎与首次访问者都能快速理解页面用途。',
            '适合使用的人群包括准备第一次参加 Learner Permit 笔试的新移民、想用中文复习规则的华人用户、以及需要集中突破交通标志题的考生。你可以根据自己的进度选择查看题库、随机练习、顺序练习、错题复盘或完整模拟考试。对时间碎片化的上班族来说，通勤前后做一组题、晚上做一次模拟，通常是更稳妥的复习节奏。',
            'OpenAA 在这里提供的是“可持续复习”的学习体验：题库持续可查、错题能回看、考试节奏可按个人安排调整。真实场景里，很多法拉盛和皇后区的华人考生会在报名前一到两周每天刷题，把容易混淆的路权题和标志题反复练熟，再去参加正式笔试。这样不仅能提升通过率，也能在后续路考准备阶段更快进入状态。',
            '完成线上练习后，建议结合 DMV 官方流程核对最新政策，包括预约、证件、费用与考试安排。OpenAA 提供中文学习与导航支持，但正式评分和结果仍以纽约 DMV 官方系统为准。',
          ]}
          highlights={['适合用户：准备 DMV 中文笔试的纽约华人、新移民、留学生', '核心功能：题库浏览、随机/顺序练习、模拟考试、错题复盘、交通标志专项', '复习建议：先掌握交通标志与高频规则，再用模拟考试检验 Learner Permit 应试节奏']}
        />

        <div className="mt-6 flex justify-center pb-2">
          <Link
            href="/dmv"
            aria-label="退出练习并返回 DMV 工具中心"
            className="rounded-2xl border border-red-100 bg-red-50 px-6 py-2.5 text-sm font-medium text-red-500"
          >
            退出练习
          </Link>
        </div>
      </div>

      <BackToTopButton />
    </div>
  )
}
