'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { ArrowRight, RotateCcw } from 'lucide-react'
import DetailBackButton from '@/components/DetailBackButton'
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
const allQuestions = questionBank.questions

const WRONG_QUESTIONS_KEY = 'openaa_dmv_wrong_question_ids'

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

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim() !== ''
}

const pageTitle = '纽约交通标志考试中文题库 | NY DMV Road Signs Test - OpenAA'
const pageDescription =
  '纽约 DMV 中文交通标志专项练习，包含真实纽约 Permit 常见交通标志、路牌识别、标志考试模拟与中文解释。'
const signFaq = [
  {
    question: '为什么要单独练 Road Signs？',
    answer: '交通标志是 Permit 考试关键部分，正式考试要求标志题至少答对 2 题。',
  },
  {
    question: '纽约 DMV 可以考中文吗？',
    answer: '可以，Permit 笔试支持简体中文，先练标志题能有效提升通过率。',
  },
  {
    question: '交通标志练完后下一步是什么？',
    answer: '建议回到总练习和 Mock Test，按完整 20 题考试节奏复习。',
  },
]

export default function SignTestPage() {
  // Prefer image-based detection: in the new question bank, sign questions are picture questions.
  const signQuestions = useMemo(
    () =>
      allQuestions.filter((q) => {
        const hasImage = isNonEmptyString(q.image)
        const isSignByMeta = q.category === 'traffic-signs' || q.tags?.includes('sign')
        return hasImage || isSignByMeta
      }),
    [],
  )

  const [questions, setQuestions] = useState<Question[]>(() => shuffle(signQuestions))
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [answered, setAnswered] = useState(false)
  const [score, setScore] = useState({ correct: 0, wrong: 0 })

  // NOTE: Hooks must be called unconditionally. Do NOT early-return before this point.

  useEffect(() => {
    addRecentView({
      type: 'dmv',
      id: 'dmv-ny-sign-test',
      title: '纽约 DMV 交通标志练习',
      url: '/dmv/ny/sign-test',
      summary: '交通标志专项练习',
    })
  }, [])

  // If questions become empty or current index is out of range, reset to a safe state.
  useEffect(() => {
    if (questions.length === 0) return
    if (current < 0 || current >= questions.length) {
      setCurrent(0)
      setSelected(null)
      setAnswered(false)
    }
  }, [questions.length, current])

  const q = questions[current]

  const handleSelect = useCallback(
    (i: number) => {
      if (answered || !q) return
      setSelected(i)
      setAnswered(true)
      if (i === q.answerIndex) {
        setScore((s) => ({ ...s, correct: s.correct + 1 }))
        removeWrongQuestion(String(q.id))
      } else {
        setScore((s) => ({ ...s, wrong: s.wrong + 1 }))
        saveWrongQuestion(String(q.id))
      }
    },
    [answered, q],
  )

  const handleNext = useCallback(() => {
    if (current < questions.length - 1) {
      setCurrent((c) => c + 1)
      setSelected(null)
      setAnswered(false)
    }
  }, [current, questions.length])

  const handleRestart = useCallback(() => {
    setQuestions(shuffle(signQuestions))
    setCurrent(0)
    setSelected(null)
    setAnswered(false)
    setScore({ correct: 0, wrong: 0 })
  }, [signQuestions])

  const webPageJsonLd = buildWebPageSchema({
    name: pageTitle,
    description: pageDescription,
    path: '/dmv/ny/sign-test',
  })
  const faqJsonLd = buildFaqSchema(signFaq)
  const breadcrumbJsonLd = buildBreadcrumbSchema([
    { name: '首页', path: '/' },
    { name: 'DMV', path: '/dmv' },
    { name: '纽约练习', path: '/dmv/ny/practice' },
    { name: '交通标志', path: '/dmv/ny/sign-test' },
  ])
  const schemaScripts = (
    <>
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
    </>
  )

  // Guards moved AFTER all hooks to keep hook order stable.
  if (signQuestions.length === 0 || questions.length === 0) {
    return (
      <div className="min-h-screen bg-zinc-50 pb-28">
        {schemaScripts}
        <div className="px-4 pt-4">
          <DetailBackButton fallbackHref="/dmv/ny/practice" />
        </div>

        <div className="px-4 pt-4">
          <div className="mb-3 text-center">
            <h1 className="text-base font-bold text-zinc-900">交通标志专项练习</h1>
            <p className="text-xs text-zinc-500 mt-0.5">纽约州常见交通标志 · 随机排列</p>
          </div>

          <div className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-zinc-900">暂无交通标志题，请检查题库图片字段。</p>
          </div>
        </div>
      </div>
    )
  }

  if (!q) {
    return (
      <div className="min-h-screen bg-zinc-50 pb-28">
        {schemaScripts}
        <div className="px-4 pt-4">
          <DetailBackButton fallbackHref="/dmv/ny/practice" />
        </div>

        <div className="px-4 pt-4">
          <div className="mb-3 text-center">
            <h1 className="text-base font-bold text-zinc-900">交通标志专项练习</h1>
            <p className="text-xs text-zinc-500 mt-0.5">纽约州常见交通标志 · 随机排列</p>
          </div>

          <div className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-zinc-900">题目加载异常，正在回到第一题…</p>
          </div>
        </div>
      </div>
    )
  }

  const progress = ((current + 1) / questions.length) * 100
  const isCorrect = answered && selected === q.answerIndex

  return (
    <div className="min-h-screen bg-zinc-50 pb-28">
      {schemaScripts}
      <div className="px-4 pt-4">
        <DetailBackButton fallbackHref="/dmv/ny/practice" />
      </div>

      <section className="mx-4 mb-4 rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm">
        <h1 className="text-lg font-black text-zinc-900">纽约 DMV Road Signs 交通标志专项练习</h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600">
          Road Signs 是 NY DMV Permit 笔试的核心部分，本页帮助你集中训练常见标志识别与中文解释，提升正式考试通过率。
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <Link href="/dmv/ny/practice" className="rounded-full bg-blue-50 px-3 py-1.5 font-medium text-blue-700">返回总练习</Link>
          <Link href="/dmv/ny/mock-test" className="rounded-full bg-green-50 px-3 py-1.5 font-medium text-green-700">去模拟考试</Link>
        </div>
      </section>

      {/* Progress */}
      <div className="sticky top-14 z-40 bg-white shadow-sm">
        <div className="flex h-1.5 w-full bg-zinc-100">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-center justify-between px-4 py-2">
          <div className="h-8 w-8" />
          <span className="text-sm font-semibold text-zinc-700">
            {current + 1} / {questions.length}
          </span>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-green-600 font-medium">✓ {score.correct}</span>
            <span className="text-red-400 font-medium">✗ {score.wrong}</span>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4">
        <div className="mb-3 text-center">
          <h2 className="text-base font-bold text-zinc-900">交通标志专项练习</h2>
          <p className="text-xs text-zinc-500 mt-0.5">纽约州常见交通标志 · 随机排列</p>
        </div>

        {/* Question Card */}
        <div className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600 font-medium">
              第 {current + 1} 题
            </span>
            <span className="rounded-full bg-zinc-50 px-2 py-0.5 text-xs text-zinc-500">交通标志</span>
          </div>

          <p className="mt-2 text-base font-semibold leading-relaxed text-zinc-900">{q.question}</p>

          {q.image && (
            <div className="mt-4 flex justify-center">
              <div className="rounded-2xl bg-zinc-50 p-4">
                <img src={q.image} alt="交通标志" className="h-48 w-48 object-contain" />
              </div>
            </div>
          )}

          <div className="mt-4 space-y-2.5">
            {q.options.map((opt, i) => {
              let cls =
                'w-full rounded-2xl border px-4 py-4 text-left text-sm font-medium transition-colors active:scale-[0.98]'
              if (answered) {
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
                <button key={i} type="button" className={cls} onClick={() => handleSelect(i)}>
                  {opt}
                </button>
              )
            })}
          </div>

          {answered && (
            <div
              className={`mt-3 rounded-xl border px-3 py-2 ${isCorrect ? 'border-green-100 bg-green-50' : 'border-red-100 bg-red-50'}`}
            >
              {isCorrect ? (
                <>
                  <p className="text-xs font-semibold text-green-700">✓ 回答正确！</p>
                  {q.explanation && (
                    <p className="mt-1 text-xs text-green-700 leading-relaxed">{q.explanation}</p>
                  )}
                </>
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

        {/* Navigation */}
        <div className="mt-4 flex gap-3">
          {answered && current < questions.length - 1 && (
            <button
              type="button"
              onClick={handleNext}
              className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-sm active:scale-[0.98]"
            >
              下一题
              <ArrowRight size={16} />
            </button>
          )}
          {answered && current >= questions.length - 1 && (
            <div className="flex-1 space-y-3">
              <div className="rounded-2xl border border-green-100 bg-green-50 p-4 text-center">
                <p className="text-lg font-black text-green-800">🎉 已完成全部标志题！</p>
                <p className="mt-1 text-sm text-green-700">
                  正确 {score.correct} / {questions.length}
                </p>
              </div>
              <button
                type="button"
                onClick={handleRestart}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3.5 text-sm font-bold text-white"
              >
                <RotateCcw size={16} />
                再来一次（随机排列）
              </button>
              <Link
                href="/dmv/ny/mock-test"
                className="block rounded-2xl border border-blue-200 py-3.5 text-center text-sm font-bold text-blue-700"
              >
                去模拟考试
              </Link>
            </div>
          )}
          {!answered && (
            <button
              type="button"
              onClick={handleRestart}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-400"
            >
              <RotateCcw size={16} />
            </button>
          )}
        </div>

        <div className="mt-6 flex justify-center pb-2">
          <Link
            href="/dmv/ny/practice"
            className="rounded-2xl border border-red-100 bg-red-50 px-6 py-2.5 text-sm font-medium text-red-500"
          >
            退出练习
          </Link>
        </div>

        <section className="mt-2 rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm">
          <h2 className="text-base font-bold text-zinc-900">常见问题 FAQ</h2>
          <div className="mt-3 space-y-3">
            {signFaq.map((item) => (
              <div key={item.question} className="rounded-xl border border-zinc-100 bg-zinc-50 p-3">
                <h3 className="text-sm font-semibold text-zinc-900">{item.question}</h3>
                <p className="mt-1 text-sm leading-relaxed text-zinc-600">{item.answer}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
