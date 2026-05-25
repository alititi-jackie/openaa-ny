'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Car,
  ChevronRight,
  FileText,
  MapPin,
  RefreshCw,
  BookMarked,
  ClipboardList,
  AlertCircle,
  Shuffle,
} from 'lucide-react'
import AppTopSection from '@/components/AppTopSection'
import BackToTopButton from '@/components/BackToTopButton'
import DetailBackButton from '@/components/DetailBackButton'
import DetailShareCard from '@/components/DetailShareCard'
import ShareButton from '@/components/ShareButton'
import DmvLicenseProcessModal from '@/components/dmv/DmvLicenseProcessModal'
import DmvPracticeEntryCards from '@/components/dmv/DmvPracticeEntryCards'
import ChannelSeoSection from '@/components/ChannelSeoSection'
import RecentViewRecorder from '@/components/RecentViewRecorder'
import { buildBreadcrumbSchema, buildFaqSchema, buildWebPageSchema } from '@/lib/seo'

const ticketsLink = '/dmv/tickets'

const dmvExamCards = [
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

const quickTools = [
  { title: 'DMV 笔试模拟', desc: '查看题库、练习模式、模拟考试与错题练习', href: '/dmv/ny/practice', Icon: BookOpen, external: false },
  { title: '罚单查询', desc: '交通罚单与处理指引', href: ticketsLink, Icon: AlertTriangle, external: false },
  { title: 'DMV 小工具', desc: '文件检查、6 Points、REAL ID 工具', href: 'https://openaa.com/tool/dmv/document-checker.html', Icon: Car, external: true },
  { title: '驾照申请', desc: 'Learner Permit 官方入口', href: 'https://dmv.ny.gov/driver-license/get-learner-permit', Icon: FileText, external: true },
  { title: '驾照更新', desc: '到期续期与资料要求', href: 'https://dmv.ny.gov/driver-license/renew-license', Icon: RefreshCw, external: true },
  { title: '地址变更', desc: '搬家后地址更新入口', href: 'https://dmv.ny.gov/address-change/how-change-your-address', Icon: MapPin, external: true },
]

const licenseSteps = [
  '准备身份证明和地址证明',
  '申请 Learner Permit',
  '参加 DMV 笔试',
  '拿到学习驾照后练车',
  '预约路考',
  '通过后领取正式驾照',
]

const officialLinks = [
  { title: 'NY DMV 官网', desc: '纽约州 DMV 官方首页，具体规则以官网最新信息为准。', href: 'https://dmv.ny.gov/' },
  { title: 'Learner Permit 申请', desc: '学习驾照申请入口与所需材料说明。', href: 'https://dmv.ny.gov/driver-license/get-learner-permit' },
  { title: 'Road Test 路考预约', desc: '官方路考预约与流程说明。', href: 'https://dmv.ny.gov/driver-license/schedule-and-take-road-test' },
  { title: 'License Renewal 驾照更新', desc: '驾照续期入口，具体费用与流程以官网为准。', href: 'https://dmv.ny.gov/driver-license/renew-license' },
  { title: 'Vehicle Registration 车辆注册', desc: '车辆注册、过户与牌照相关官方入口。', href: 'https://dmv.ny.gov/registration' },
  { title: 'Change Address 地址变更', desc: '地址变更官方说明与办理入口。', href: 'https://dmv.ny.gov/address-change' },
  { title: 'Traffic Tickets 交通罚单', desc: '纽约州交通罚单查询与处理入口。', href: 'https://dmv.ny.gov/tickets' },
  { title: 'NYC Parking Tickets 停车罚单', desc: '纽约市停车罚单查询与缴费入口。', href: 'https://www.nyc.gov/site/finance/vehicles/services-violation.page' },
]

const localServices = ['驾校', '汽车保险', '翻译公证', '罚单律师', '修车服务', '二手车买卖']

const pageTitle = '2026纽约 DMV 中文驾照指南 | Permit笔试模拟・罚单查询・驾照流程 - OpenAA'
const pageDescription =
  '提供纽约州 NY DMV 中文驾照学习服务，包括 Permit 笔试模拟考试、交通标志练习、纽约 DMV 流程教程、罚单查询、新手考驾照指南等。适合纽约华人、新移民与留学生。'

const dmvFaq = [
  {
    question: '纽约 DMV Permit 要多少题及格？',
    answer: '纽约 DMV Permit 笔试共 20 题，至少答对 14 题，且交通标志题至少答对 2 题。',
  },
  {
    question: '纽约 DMV 可以考中文吗？',
    answer: '可以，纽约 DMV Permit 笔试支持简体中文。',
  },
  {
    question: '纽约 Permit 通过后多久能预约路考？',
    answer: '通过 Permit 后需先满足练车要求，再预约 Road Test。',
  },
]

type DmvGuidePost = {
  id: string
  slug: string
  title: string
}

interface DmvPageClientProps {
  questionCount: number
  dmvGuides: DmvGuidePost[]
}

export default function DmvPageClient({ questionCount, dmvGuides }: DmvPageClientProps) {
  const practiceSectionRef = useRef<HTMLElement | null>(null)
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false)
  const [defaultProcessStep, setDefaultProcessStep] = useState(0)

  const handleScrollToPractice = () => {
    practiceSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const openProcessModal = (stepIndex: number) => {
    setDefaultProcessStep(stepIndex)
    setIsProcessModalOpen(true)
  }

  const webPageJsonLd = buildWebPageSchema({
    name: pageTitle,
    description: pageDescription,
    path: '/dmv',
  })
  const faqJsonLd = buildFaqSchema(dmvFaq)
  const breadcrumbJsonLd = buildBreadcrumbSchema([
    { name: '首页', path: '/' },
    { name: 'DMV', path: '/dmv' },
  ])

  return (
    <div className="min-h-screen bg-zinc-50 pb-28">
      <RecentViewRecorder
        item={{
          type: 'dmv',
          id: 'dmv',
          title: 'OpenAA DMV 工具中心',
          url: '/dmv',
          summary: '纽约 DMV 笔试、罚单查询、驾照申请与车辆服务入口',
        }}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <AppTopSection bannerPosition="dmv" />
      <div className="px-4 pt-4">
        <div className="mb-6 flex items-center justify-between">
          <DetailBackButton fallbackHref="/" label="← 返回首页" inToolbar forceHref />
          <ShareButton
            path="/dmv"
            title={pageTitle}
            text="纽约 DMV 笔试、罚单查询、驾照申请与车辆服务入口。"
          />
        </div>

        <section className="rounded-2xl border border-blue-100 bg-gradient-to-b from-blue-50 to-white p-4 shadow-sm">
          <div>
            <h1 className="text-2xl font-black text-zinc-900">OpenAA DMV 工具中心</h1>
            <p className="mt-2 text-sm font-medium text-blue-700">纽约 DMV 笔试、罚单查询、驾照申请与车辆服务入口</p>
          </div>
          <p className="mt-2 text-sm text-zinc-600">为美国华人整理常用 DMV 工具、官方入口和中文说明</p>
        </section>

        <section className="mt-4">
          <h2 className="text-base font-bold text-zinc-900">DMV 快捷工具</h2>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {quickTools.map(({ title, desc, href, Icon, external }) => {
              if (title === 'DMV 笔试模拟') {
                return (
                  <button
                    key={title}
                    type="button"
                    onClick={handleScrollToPractice}
                    className="rounded-2xl border border-zinc-100 bg-white p-3 text-left shadow-sm transition-transform active:scale-[0.98]"
                  >
                     <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                          <Icon size={16} />
                        </div>
                        <p className="mt-2 text-sm font-semibold text-zinc-900">{title}</p>
                        <p className="mt-1 text-xs text-zinc-500">{desc}</p>
                      </div>
                      <ChevronRight size={14} className="mt-1 shrink-0 text-zinc-400" />
                    </div>
                  </button>
                )
              }

              return (
                <Link
                  key={title}
                  href={href}
                  {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  className="rounded-2xl border border-zinc-100 bg-white p-3 shadow-sm transition-transform active:scale-[0.98]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                        <Icon size={16} />
                      </div>
                      <p className="mt-2 text-sm font-semibold text-zinc-900">{title}</p>
                      <p className="mt-1 text-xs text-zinc-500">{desc}</p>
                    </div>
                    <ChevronRight size={14} className="mt-1 shrink-0 text-zinc-400" />
                  </div>
                </Link>
              )
            })}
          </div>
        </section>

        <DetailShareCard
          path="/dmv"
          title={pageTitle}
          text="纽约 DMV 笔试、罚单查询、驾照申请与车辆服务入口。"
        />

        <section className="mt-4 rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm">
          <h2 className="text-base font-bold text-zinc-900">纽约华人 DMV 中文学习平台</h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600">
            这里集中提供 NY DMV 学习入口：Permit 笔试练习、Practice Test、Road Test 流程说明、DMV 教程与 tickets 查询，帮助纽约华人、新移民与留学生更快上手。
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-zinc-700">
            <li>Permit 中文练习与模拟考试</li>
            <li>交通标志 Road Signs 专项训练</li>
            <li>DMV 教程与新手办证流程</li>
            <li>停车罚单 / 超速罚单 / 红灯罚单查询</li>
          </ul>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <Link href="/dmv/ny/practice" className="rounded-full bg-blue-50 px-3 py-1.5 font-medium text-blue-700">中文练习</Link>
            <Link href="/dmv/ny/mock-test" className="rounded-full bg-green-50 px-3 py-1.5 font-medium text-green-700">模拟考试</Link>
            <Link href="/dmv/ny/sign-test" className="rounded-full bg-orange-50 px-3 py-1.5 font-medium text-orange-700">交通标志</Link>
            <Link href="/news?category=DMV教程" className="rounded-full bg-zinc-100 px-3 py-1.5 font-medium text-zinc-700">DMV 教程</Link>
            <Link href="/dmv/tickets" className="rounded-full bg-amber-50 px-3 py-1.5 font-medium text-amber-700">罚单查询</Link>
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm">
          <button
            type="button"
            onClick={() => openProcessModal(0)}
            className="flex cursor-pointer items-center gap-1 rounded-md text-left text-base font-bold text-zinc-900 transition-colors hover:bg-zinc-50 hover:text-zinc-700 active:bg-zinc-100"
          >
            新手办驾照流程
            <ChevronRight size={14} className="text-zinc-400" />
          </button>
          <div className="mt-3 space-y-2">
            {licenseSteps.map((step, index) => (
              <button
                key={step}
                type="button"
                onClick={() => openProcessModal(index)}
                className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl bg-zinc-50 px-3 py-2 text-left transition-colors hover:bg-zinc-100 active:bg-zinc-100"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                    {index + 1}
                  </span>
                  <p className="text-sm text-zinc-700">{step}</p>
                </div>
                <ChevronRight size={14} className="shrink-0 text-zinc-300" />
              </button>
            ))}
          </div>
        </section>

        <section ref={practiceSectionRef} id="dmv-practice-section" className="mt-4">
          <h2 className="text-base font-bold text-zinc-900">纽约 DMV 笔试练习</h2>
          <p className="mt-1 text-xs text-zinc-500">中文题库 · {questionCount} 题 · 无需登录 · 支持错题练习</p>

          <DmvPracticeEntryCards cards={dmvExamCards} className="mt-3 grid grid-cols-2 gap-3" />
        </section>

        <section className="mt-4 grid gap-3">
          <div className="rounded-2xl border border-amber-100 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-zinc-900">罚单查询</h3>
                <p className="mt-1 text-sm text-zinc-600">整理停车罚单、红灯摄像头、交通罚单等常用入口</p>
              </div>
              <AlertTriangle size={18} className="shrink-0 text-amber-600" />
            </div>
            <Link
              href={ticketsLink}
              className="mt-3 inline-flex items-center gap-1 rounded-full bg-amber-500 px-3 py-1.5 text-sm font-medium text-white"
            >
              查询罚单
              <ArrowRight size={14} />
            </Link>
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm">
          <h2 className="text-base font-bold text-zinc-900">官方入口</h2>
          <div className="mt-2 divide-y divide-zinc-100">
            {officialLinks.map((item) => (
              <Link
                key={item.title}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-zinc-900">{item.title}</p>
                  <p className="mt-1 text-xs text-zinc-500">{item.desc}</p>
                </div>
                <ChevronRight size={16} className="shrink-0 text-zinc-400" />
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm">
          <h2 className="text-base font-bold text-zinc-900">DMV 相关本地服务</h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {localServices.map((item) => (
              <Link
                key={item}
                href="/services"
                className="rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2 text-sm text-zinc-700 transition-colors active:bg-zinc-100"
              >
                {item}
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm">
          <Link href="/news?category=DMV教程" className="text-base font-bold text-zinc-900">
            DMV 教程文章
          </Link>
          <div className="mt-2 divide-y divide-zinc-100">
            {dmvGuides.length > 0 ? (
              dmvGuides.map((item) => (
                <Link key={item.id} href={`/news/${item.slug}`} className="flex items-center justify-between py-3">
                  <p className="text-sm text-zinc-700">{item.title}</p>
                  <ChevronRight size={15} className="shrink-0 text-zinc-400" />
                </Link>
              ))
            ) : (
              <p className="py-3 text-sm text-zinc-400">暂无 DMV 教程文章</p>
            )}
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
            {dmvFaq.map((item) => (
              <div key={item.question} className="rounded-xl border border-zinc-100 bg-zinc-50 p-3">
                <h3 className="text-sm font-semibold text-zinc-900">{item.question}</h3>
                <p className="mt-1 text-sm leading-relaxed text-zinc-600">{item.answer}</p>
              </div>
            ))}
          </div>
        </section>

        <ChannelSeoSection
          title="纽约 DMV 中文频道：驾照学习与办事入口整合"
          paragraphs={[
            'OpenAA 的 DMV 频道面向纽约华人驾驶学习与办事需求，重点覆盖纽约 DMV、DMV 中文、Permit 中文练习、纽约驾照流程、Road Test 预约以及罚单查询等高频关键词。很多用户在准备材料或等车时先用手机快速查流程，因此页面底部补充了完整正文，帮助搜索引擎在接口或图片慢加载时仍能准确理解频道内容。',
            '这个频道适合初次在纽约考驾照的新移民、需要补考或续期的老司机、以及帮家人办理业务的华人家庭。你可以先从 Permit 题库与模拟考试开始，熟悉交通标志和规则，再进入 Road Test 预约、车辆注册、地址变更等官方入口。对于不熟悉英文官网结构的用户，这种“中文说明 + 官方链接”的组合能显著降低操作门槛。',
            'OpenAA 的价值在于把分散的 DMV 信息串成可执行路径：先学习、再准备材料、随后预约考试或处理罚单。真实场景中，很多人白天上班，晚上才有时间查“华人考驾照”相关内容；也有人在收到罚单后急需找到正确入口。通过本页，你可以先看步骤说明，再跳转官方页面确认最新规则，减少来回搜索和误操作风险。',
            '需要特别说明的是，DMV 费用、时间与合规要求会按州政策更新，OpenAA 提供的是中文整理和导航帮助，最终以纽约 DMV 官方发布信息为准。建议在提交申请、预约 Road Test、处理 ticket 或办理驾照续期前，先核对官方页面，再按个人情况准备材料。',
          ]}
          highlights={['适合用户：纽约华人新手司机、需要续期或处理罚单的本地车主', '核心功能：Permit 中文练习、模拟考试、Road Test 与官方入口导航、罚单查询', '使用建议：先在中文内容中确认流程，再到纽约 DMV 官方页面完成最终操作']}
        />
      </div>
      <DmvLicenseProcessModal
        open={isProcessModalOpen}
        initialStep={defaultProcessStep}
        onClose={() => setIsProcessModalOpen(false)}
      />
      <BackToTopButton />
    </div>
  )
}
