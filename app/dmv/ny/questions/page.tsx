'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { Search, X, Eye, EyeOff } from 'lucide-react'
import BackToTopButton from '@/components/BackToTopButton'
import DetailBackButton from '@/components/DetailBackButton'
import HorizontalCategoryTabs from '@/components/HorizontalCategoryTabs'
import { supabase } from '@/lib/supabase'
import { buildBreadcrumbSchema, buildFaqSchema, buildWebPageSchema } from '@/lib/seo'
import { addRecentView } from '@/lib/recentViews'
import questionsData from '@/data/openaa-ny-dmv-questions-v1.json'

interface Question {
  id: number
  category: string
  question: string
  image: string | null
  options: string[]
  answerIndex: number
  answerText: string
  explanation: string
  reference: string
  difficulty: string
  tags: string[]
}

type QuestionBank = {
  _meta?: {
    totalQuestions?: number
  }
  questions: Question[]
}

const questionBank = questionsData as QuestionBank
const questions = questionBank.questions

const WRONG_QUESTIONS_KEY = 'openaa_dmv_wrong_question_ids'
const ALL_CATEGORY_VALUE = '全部'

const CATEGORY_LABELS: Record<string, string> = {
  [ALL_CATEGORY_VALUE]: '全部',
  'traffic-signs': '交通标志',
  'traffic-control': '交通管制',
  'right-of-way': '路权与让行',
  turns: '转弯',
  'passing-lanes': '超车与车道',
  parking: '停车',
  'speed-weather': '速度与天气',
  highway: '高速公路',
  'alcohol-drugs': '酒精与药物',
  safety: '安全驾驶',
  'sharing-road': '共享道路',
  law: '交通法规',
  'road-signs-general': '道路标志综合',
}

const CATEGORY_ORDER = [
  ALL_CATEGORY_VALUE,
  'traffic-signs',
  'traffic-control',
  'right-of-way',
  'turns',
  'passing-lanes',
  'parking',
  'speed-weather',
  'highway',
  'alcohol-drugs',
  'safety',
  'sharing-road',
  'law',
  'road-signs-general',
] as const

const pageTitle = '纽约 DMV 中文题库 2026 | Permit 真题练习与答案解析 - OpenAA'
const pageDescription =
  '提供纽约 DMV Permit 中文题库与答案解析，支持查看全部 DMV 真题、交通标志、道路规则与中文解释，适合纽约华人 DMV 笔试学习。'
const questionsFaq = [
  {
    question: '纽约 DMV Permit 要多少题及格？',
    answer: '考试共 20 题，至少答对 14 题，且交通标志题至少答对 2 题。',
  },
  {
    question: '题库有答案解析吗？',
    answer: '有，题库支持查看答案和中文解析，方便理解道路规则与交通标志。',
  },
  {
    question: '看完题库后下一步做什么？',
    answer: '建议先去 Practice 练习，再做 Mock Test 模拟考试检验通过率。',
  },
]

function getCategoryLabel(category: string) {
  return CATEGORY_LABELS[category] ?? category
}

function saveWrongQuestion(id: string) {
  try {
    const stored = localStorage.getItem(WRONG_QUESTIONS_KEY)
    const ids: string[] = stored ? JSON.parse(stored) : []
    if (!ids.includes(id)) {
      ids.push(id)
      localStorage.setItem(WRONG_QUESTIONS_KEY, JSON.stringify(ids))
    }
  } catch {}
}

function removeWrongQuestion(id: string) {
  try {
    const stored = localStorage.getItem(WRONG_QUESTIONS_KEY)
    const ids: string[] = stored ? JSON.parse(stored) : []
    const updated = ids.filter((x) => x !== id)
    localStorage.setItem(WRONG_QUESTIONS_KEY, JSON.stringify(updated))
  } catch {}
}

interface QuestionCardProps {
  q: Question
  showAnswer: boolean
  index: number
}

function QuestionCard({ q, showAnswer, index }: QuestionCardProps) {
  const [selected, setSelected] = useState<number | null>(null)
  const [answered, setAnswered] = useState(false)

  useEffect(() => {
    setSelected(null)
    setAnswered(false)
  }, [q.id])

  const handleSelect = useCallback(
    (i: number) => {
      if (showAnswer || answered) return
      setSelected(i)
      setAnswered(true)
      if (i !== q.answerIndex) {
        saveWrongQuestion(String(q.id))
      } else {
        removeWrongQuestion(String(q.id))
      }
    },
    [showAnswer, answered, q.answerIndex, q.id],
  )

  const isCorrect = selected === q.answerIndex

  return (
    <div className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm">
      <div className="mb-1 flex items-center gap-2">
        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600 font-medium">
          {index + 1}
        </span>
        <span className="rounded-full bg-zinc-50 px-2 py-0.5 text-xs text-zinc-500">
          {getCategoryLabel(q.category)}
        </span>
        {q.difficulty === 'hard' && (
          <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-500">难</span>
        )}
      </div>

      <p className="mt-2 text-sm font-semibold leading-relaxed text-zinc-900">{q.question}</p>

      {q.image && (
        <div className="mt-3 flex justify-center">
          <img
            src={q.image}
            alt="交通标志"
            className="h-40 w-40 rounded-xl object-contain"
            loading="lazy"
          />
        </div>
      )}

      <div className="mt-3 space-y-2">
        {q.options.map((opt, i) => {
          let cls =
            'w-full rounded-2xl border px-4 py-3.5 text-left text-sm font-medium transition-colors active:scale-[0.98]'
          if (showAnswer) {
            if (i === q.answerIndex) {
              cls += ' border-green-200 bg-green-50 text-green-800'
            } else {
              cls += ' border-zinc-100 bg-zinc-50 text-zinc-600'
            }
          } else if (answered) {
            if (i === q.answerIndex) {
              cls += ' border-green-200 bg-green-50 text-green-800'
            } else if (i === selected) {
              cls += ' border-red-200 bg-red-50 text-red-700'
            } else {
              cls += ' border-zinc-100 bg-zinc-50 text-zinc-400'
            }
          } else {
            cls += ' border-zinc-200 bg-white text-zinc-800 active:bg-blue-50 active:border-blue-200'
          }
          return (
            <button key={i} className={cls} onClick={() => handleSelect(i)} type="button">
              {opt}
            </button>
          )
        })}
      </div>

      {showAnswer && (
        <div className="mt-3 rounded-xl bg-green-50 border border-green-100 px-3 py-2">
          <p className="text-xs font-semibold text-green-700">✓ 正确答案：{q.answerText}</p>
          {q.explanation && (
            <p className="mt-1 text-xs text-green-700 leading-relaxed">{q.explanation}</p>
          )}
        </div>
      )}

      {!showAnswer && answered && (
        <div
          className={`mt-3 rounded-xl border px-3 py-2 ${isCorrect ? 'border-green-100 bg-green-50' : 'border-red-100 bg-red-50'}`}
        >
          {isCorrect ? (
            <p className="text-xs font-semibold text-green-700">✓ 回答正确！</p>
          ) : (
            <>
              <p className="text-xs font-semibold text-red-600">✗ 回答错误</p>
              <p className="mt-0.5 text-xs text-red-700">正确答案：{q.answerText}</p>
              {q.explanation && (
                <p className="mt-1 text-xs text-red-700 leading-relaxed">{q.explanation}</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default function PracticePage() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<string>(ALL_CATEGORY_VALUE)
  const [showAnswer, setShowAnswer] = useState(false)
  const [showLoginBanner, setShowLoginBanner] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setIsLoggedIn(!!data.user)
    })
  }, [])

  useEffect(() => {
    addRecentView({
      type: 'dmv',
      id: 'dmv-ny-questions',
      title: '纽约 DMV 中文题库',
      url: '/dmv/ny/questions',
      summary: 'Permit 真题练习与答案解析',
    })
  }, [])

  const filtered = useMemo(() => {
    let list = questions
    if (category !== ALL_CATEGORY_VALUE) {
      list = list.filter((q) => q.category === category)
    }
    if (search.trim()) {
      const kw = search.trim().toLowerCase()
      list = list.filter(
        (q) =>
          q.question.toLowerCase().includes(kw) ||
          q.options.some((o) => o.toLowerCase().includes(kw)),
      )
    }
    return list
  }, [search, category])

  const handleScrollEnd = useCallback(() => {
    if (!isLoggedIn) {
      setShowLoginBanner(true)
    }
  }, [isLoggedIn])

  useEffect(() => {
    const handleScroll = () => {
      const bottom = window.scrollY + window.innerHeight >= document.body.scrollHeight - 200
      if (bottom) handleScrollEnd()
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [handleScrollEnd])

  const webPageJsonLd = buildWebPageSchema({
    name: pageTitle,
    description: pageDescription,
    path: '/dmv/ny/questions',
  })
  const faqJsonLd = buildFaqSchema(questionsFaq)
  const breadcrumbJsonLd = buildBreadcrumbSchema([
    { name: '首页', path: '/' },
    { name: 'DMV', path: '/dmv' },
    { name: '纽约练习', path: '/dmv/ny/practice' },
    { name: '题库', path: '/dmv/ny/questions' },
  ])

  return (
    <div className="min-h-screen bg-zinc-50 pb-28">
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
      <div className="px-4 pt-4">
        <DetailBackButton fallbackHref="/dmv/ny/practice" />
      </div>

      <section className="mx-4 mb-4 rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm">
        <h1 className="text-lg font-black text-zinc-900">纽约 DMV 中文题库与答案解析</h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600">
          本页提供 NY DMV Permit 全量中文题库，覆盖交通标志、道路规则和常见易错点，支持按分类学习与答案解析，适合纽约华人系统备考。
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <Link href="/dmv/ny/practice" className="rounded-full bg-blue-50 px-3 py-1.5 font-medium text-blue-700">开始练习</Link>
          <Link href="/dmv/ny/mock-test" className="rounded-full bg-green-50 px-3 py-1.5 font-medium text-green-700">开始模拟考试</Link>
        </div>
      </section>

      {/* Header */}
      <div className="sticky top-14 z-40 border-b border-zinc-100 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-bold text-zinc-900">查看题库</h2>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAnswer((v) => !v)}
              className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${showAnswer ? 'bg-blue-600 text-white' : 'bg-zinc-100 text-zinc-600'}`}
            >
              {showAnswer ? <Eye size={12} /> : <EyeOff size={12} />}
              {showAnswer ? '显示答案' : '隐藏答案'}
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="mt-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="搜索题目..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2 pl-9 pr-8 text-sm text-zinc-800 placeholder-zinc-400 outline-none focus:border-blue-300 focus:bg-white"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <p className="mt-1.5 text-xs text-zinc-400">
            共 {filtered.length} 题 {category !== ALL_CATEGORY_VALUE && `· ${getCategoryLabel(category)}`}
            {!showAnswer && ' · 点击选项可以直接答题'}
          </p>
        </div>
      </div>

      <HorizontalCategoryTabs
        categories={CATEGORY_ORDER}
        activeCategory={category}
        onChange={setCategory}
        getLabel={getCategoryLabel}
        className="static top-auto z-auto"
      />

      {/* Question List */}
      <div className="space-y-3 px-4 pt-4">
        {filtered.length === 0 ? (
          <div className="mt-12 text-center text-zinc-400">
            <p className="text-4xl">🔍</p>
            <p className="mt-2 text-sm">没有找到相关题目</p>
          </div>
        ) : (
          filtered.map((q, i) => <QuestionCard key={q.id} q={q} showAnswer={showAnswer} index={i} />)
        )}
      </div>

      {/* Login Banner */}
      {showLoginBanner && !isLoggedIn && (
        <div className="mx-4 mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <p className="text-sm font-semibold text-blue-800">🎉 已浏览完题库！</p>
          <p className="mt-1 text-xs text-blue-700 leading-relaxed">
            登录 OpenAA 后，未来可同步错题和学习进度，支持多设备继续学习。
          </p>
          <div className="mt-3 flex gap-2">
            <Link
              href="/auth/login"
              className="flex-1 rounded-xl bg-blue-600 py-2 text-center text-sm font-medium text-white"
            >
              登录 / 注册
            </Link>
            <button
              type="button"
              onClick={() => setShowLoginBanner(false)}
              className="rounded-xl border border-blue-200 px-4 py-2 text-sm text-blue-600"
            >
              稍后
            </button>
          </div>
        </div>
      )}

      <div className="mt-6 flex justify-center pb-2">
        <Link
          href="/dmv/ny/practice"
          className="rounded-2xl border border-red-100 bg-red-50 px-6 py-2.5 text-sm font-medium text-red-500"
        >
          退出练习
        </Link>
      </div>

      <section className="mx-4 mt-2 rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm">
        <h2 className="text-base font-bold text-zinc-900">常见问题 FAQ</h2>
        <div className="mt-3 space-y-3">
          {questionsFaq.map((item) => (
            <div key={item.question} className="rounded-xl border border-zinc-100 bg-zinc-50 p-3">
              <h3 className="text-sm font-semibold text-zinc-900">{item.question}</h3>
              <p className="mt-1 text-sm leading-relaxed text-zinc-600">{item.answer}</p>
            </div>
          ))}
        </div>
      </section>

      <BackToTopButton />
    </div>
  )
}
