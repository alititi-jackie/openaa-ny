'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, CheckCircle, XCircle } from 'lucide-react'
import DetailBackButton from '@/components/DetailBackButton'
import { supabase } from '@/lib/supabase'
import { toAbsoluteUrl } from '@/lib/site'
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

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function buildExam(): Question[] {
  const signQs = shuffle(allQuestions.filter((q) => q.category === '交通标志'))
  const otherQs = shuffle(allQuestions.filter((q) => q.category !== '交通标志'))
  const signPick = signQs.slice(0, 4)
  const otherPick = otherQs.slice(0, 16)
  return shuffle([...signPick, ...otherPick])
}

type Phase = 'intro' | 'exam' | 'result'

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m === 0) return `${s}秒`
  return `${m}分${s}秒`
}

const pageTitle = '纽约 DMV 模拟考试中文 2026 | 免费 NY Permit Practice Test - OpenAA'
const pageDescription =
  '模拟真实纽约 DMV Permit 考试流程，20 题中文模拟考试，支持成绩统计、错题分析、交通标志专项练习，帮助快速熟悉纽约 DMV 理论考试。'
const mockFaq = [
  {
    question: '纽约 DMV Permit 要多少题及格？',
    answer: '模拟标准与正式考试一致：20 题至少答对 14 题，且交通标志题至少答对 2 题。',
  },
  {
    question: '纽约 DMV 可以考中文吗？',
    answer: '可以，纽约 DMV Permit 笔试支持简体中文。',
  },
  {
    question: '纽约 Permit 通过后多久能预约 Road Test？',
    answer: '通过 Permit 并满足练车要求后，可在官方系统预约 Road Test。',
  },
]

export default function MockTestPage() {
  const [phase, setPhase] = useState<Phase>('intro')
  const [questions, setQuestions] = useState<Question[]>([])
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<(number | null)[]>([])
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const startTimeRef = useRef<number | null>(null)
  const [examSeconds, setExamSeconds] = useState(0)
  const [shareToast, setShareToast] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setIsLoggedIn(!!data.user))
  }, [])

  useEffect(() => {
    addRecentView({
      type: 'dmv',
      id: 'dmv-ny-mock-test',
      title: '纽约 DMV 模拟考试',
      url: '/dmv/ny/mock-test',
      summary: '20 题中文模拟考试与成绩统计',
    })
  }, [])

  const startExam = useCallback(() => {
    const qs = buildExam()
    setQuestions(qs)
    setAnswers(new Array(qs.length).fill(null))
    setCurrent(0)
    startTimeRef.current = Date.now()
    setPhase('exam')
  }, [])

  const handleSelect = useCallback(
    (i: number) => {
      setAnswers((prev) => {
        const next = [...prev]
        next[current] = i
        return next
      })
    },
    [current],
  )

  const handleNext = useCallback(() => {
    if (current < questions.length - 1) {
      setCurrent((c) => c + 1)
    }
  }, [current, questions.length])

  const handlePrev = useCallback(() => {
    if (current > 0) setCurrent((c) => c - 1)
  }, [current])

  const handleSubmit = useCallback(() => {
    // Save wrong questions to localStorage
    questions.forEach((q, i) => {
      if (answers[i] !== q.answerIndex) {
        saveWrongQuestion(String(q.id))
      }
    })
    const elapsed = startTimeRef.current ? Math.round((Date.now() - startTimeRef.current) / 1000) : 0
    setExamSeconds(elapsed)
    setPhase('result')
  }, [questions, answers])

  const webPageJsonLd = buildWebPageSchema({
    name: pageTitle,
    description: pageDescription,
    path: '/dmv/ny/mock-test',
  })
  const faqJsonLd = buildFaqSchema(mockFaq)
  const breadcrumbJsonLd = buildBreadcrumbSchema([
    { name: '首页', path: '/' },
    { name: 'DMV', path: '/dmv' },
    { name: '纽约练习', path: '/dmv/ny/practice' },
    { name: '模拟考试', path: '/dmv/ny/mock-test' },
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

  if (phase === 'intro') {
    return (
      <div className="min-h-screen bg-zinc-50 pb-28">
        {schemaScripts}
        <div className="px-4 pt-4">
          <DetailBackButton fallbackHref="/dmv/ny/practice" />
          <h1 className="mb-4 text-base font-bold text-zinc-900">纽约 DMV 模拟考试</h1>

          <div className="rounded-2xl border border-blue-100 bg-gradient-to-b from-blue-50 to-white p-5 shadow-sm">
            <div className="text-4xl mb-3">📝</div>
            <h2 className="text-xl font-black text-zinc-900">模拟考试说明</h2>
            <p className="mt-2 text-sm text-zinc-600 leading-relaxed">
              这是接近真实 NY DMV Permit 的 Practice Test 场景：20 题考试、14 题及格、交通标志至少答对 2 题。适合纽约华人、新移民、留学生考前冲刺。
            </p>

            <div className="mt-4 space-y-2">
              {[
                ['📋', '总共 20 道题目'],
                ['🚦', '包含 4 道交通标志题'],
                ['✅', '答对 14 题以上才能通过'],
                ['⚠️', '交通标志题至少答对 2 道'],
                ['🔇', '作答时不显示正确答案'],
              ].map(([icon, text]) => (
                <div key={text as string} className="flex items-center gap-2 text-sm text-zinc-700">
                  <span>{icon}</span>
                  <span>{text}</span>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={startExam}
              className="mt-5 w-full rounded-2xl bg-blue-600 py-4 text-base font-bold text-white shadow-sm active:scale-[0.98]"
            >
              开始考试
            </button>
          </div>

          <section className="mt-4 rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm">
            <h2 className="text-base font-bold text-zinc-900">如何使用模拟考试提升通过率？</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-zinc-700">
              <li>先做 Practice Test 巩固 Permit 基础</li>
              <li>再做本页模拟考试检验速度与正确率</li>
              <li>最后回到错题和 Road Signs 专项复习</li>
            </ul>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <Link href="/dmv/ny/practice" className="rounded-full bg-blue-50 px-3 py-1.5 font-medium text-blue-700">返回练习页</Link>
              <Link href="/dmv/ny/questions" className="rounded-full bg-zinc-100 px-3 py-1.5 font-medium text-zinc-700">查看题库</Link>
              <Link href="/dmv/ny/sign-test" className="rounded-full bg-orange-50 px-3 py-1.5 font-medium text-orange-700">交通标志专项</Link>
            </div>
          </section>

          <section className="mt-4 rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm">
            <h2 className="text-base font-bold text-zinc-900">常见问题 FAQ</h2>
            <div className="mt-3 space-y-3">
              {mockFaq.map((item) => (
                <div key={item.question} className="rounded-xl border border-zinc-100 bg-zinc-50 p-3">
                  <h3 className="text-sm font-semibold text-zinc-900">{item.question}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-zinc-600">{item.answer}</p>
                </div>
              ))}
            </div>
          </section>

          <div className="mt-6 flex justify-center pb-2">
            <Link
              href="/dmv/ny/practice"
              className="rounded-2xl border border-red-100 bg-red-50 px-6 py-2.5 text-sm font-medium text-red-500"
            >
              退出练习
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (phase === 'exam') {
    const q = questions[current]
    const progress = ((current + 1) / questions.length) * 100
    const selectedAnswer = answers[current]
    const answered = selectedAnswer !== null

    return (
      <div className="min-h-screen bg-zinc-50 pb-28">
        {schemaScripts}
        {/* Progress bar */}
        <div className="sticky top-14 z-40 bg-white shadow-sm">
          <div className="flex h-1.5 w-full bg-zinc-100">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between px-4 py-2">
            <button
              type="button"
              onClick={handlePrev}
              disabled={current === 0}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 disabled:opacity-30"
            >
              <ArrowLeft size={16} />
            </button>
            <span className="text-sm font-semibold text-zinc-700">
              {current + 1} / {questions.length}
            </span>
            <div className="flex items-center gap-1">
              {answers.filter((a) => a !== null).length} 已答
            </div>
          </div>
        </div>

        <div className="px-4 pt-4">
          {/* Question */}
          <div className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center gap-2">
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600 font-medium">
                第 {current + 1} 题
              </span>
              <span className="rounded-full bg-zinc-50 px-2 py-0.5 text-xs text-zinc-500">
                {q.category}
              </span>
            </div>

            <p className="mt-2 text-base font-semibold leading-relaxed text-zinc-900">
              {q.question}
            </p>

            {q.image && (
              <div className="mt-3 flex justify-center">
                <img
                  src={q.image}
                  alt="交通标志"
                  className="h-44 w-44 rounded-xl object-contain"
                />
              </div>
            )}

            <div className="mt-4 space-y-2.5">
              {q.options.map((opt, i) => {
                let cls =
                  'w-full rounded-2xl border px-4 py-4 text-left text-sm font-medium break-words whitespace-normal transition-colors active:scale-[0.98]'
                if (answered && i === selectedAnswer) {
                  cls += ' border-blue-300 bg-blue-50 text-blue-800'
                } else {
                  cls +=
                    ' border-zinc-200 bg-white text-zinc-800 active:bg-blue-50 active:border-blue-200'
                }
                return (
                  <button
                    key={i}
                    type="button"
                    className={cls}
                    onClick={() => handleSelect(i)}
                  >
                    {opt}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Navigation */}
          <div className="mt-4 flex gap-3">
            {current < questions.length - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-sm active:scale-[0.98]"
              >
                下一题
                <ArrowRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                className="flex-1 rounded-2xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-sm active:scale-[0.98]"
              >
                提交考试
              </button>
            )}
          </div>

          {/* Question Overview */}
          <div className="mt-4 rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm">
            <p className="mb-2 text-xs font-semibold text-zinc-500">题目概览</p>
            <div className="flex flex-wrap gap-2">
              {questions.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setCurrent(i)}
                  className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm font-medium transition-colors ${
                    i === current
                      ? 'bg-blue-600 text-white'
                      : answers[i] !== null
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-zinc-100 text-zinc-600'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 flex justify-center pb-2">
            <Link
              href="/dmv/ny/practice"
              className="rounded-2xl border border-red-100 bg-red-50 px-6 py-2.5 text-sm font-medium text-red-500"
            >
              退出练习
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Result phase
  const correctCount = questions.filter((q, i) => answers[i] === q.answerIndex).length
  const wrongCount = questions.filter(
    (q, i) => answers[i] !== null && answers[i] !== q.answerIndex,
  ).length
  const unanswered = questions.filter((_, i) => answers[i] === null).length
  const signQuestions = questions.filter((q) => q.category === '交通标志')
  const signCorrect = signQuestions.filter((q) => {
    const globalIdx = questions.indexOf(q)
    return answers[globalIdx] === q.answerIndex
  }).length
  const passed = correctCount >= 14 && signCorrect >= 2

  const handleMockShare = async () => {
    const timeStr = formatTime(examSeconds)
    const practiceUrl = toAbsoluteUrl('/dmv/ny/practice')
    const text = passed
      ? `我刚刚通过了 OpenAA DMV 模拟考试 🎉\n正确：${correctCount}/20\n交通标志：${signCorrect}/${signQuestions.length}\n用时：${timeStr}\n\n${practiceUrl}`
      : `我正在练习 OpenAA DMV 中文模拟考试 🚗\n正确：${correctCount}/20\n继续加油！\n\n${practiceUrl}`
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: 'OpenAA DMV 模拟考试', text })
      } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(text)
      } catch {}
      setShareToast('链接已复制')
      setTimeout(() => setShareToast(''), 2000)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 pb-28">
      {schemaScripts}
      <div className="px-4 pt-4">
        <DetailBackButton fallbackHref="/dmv/ny/practice" />
        <h1 className="mb-4 text-base font-bold text-zinc-900">考试结果</h1>

        {/* Result Card */}
        <div
          className={`rounded-2xl border p-5 shadow-sm ${passed ? 'border-green-200 bg-gradient-to-b from-green-50 to-white' : 'border-red-200 bg-gradient-to-b from-red-50 to-white'}`}
        >
          <div className="text-5xl mb-3 text-center">{passed ? '🎉' : '😔'}</div>
          <p
            className={`text-center text-xl font-black ${passed ? 'text-green-800' : 'text-red-700'}`}
          >
            {passed ? '恭喜你通过模拟考试！' : '未通过，请继续练习'}
          </p>
          {!passed && (
            <p className="mt-2 text-center text-sm text-red-600">
              未通过，请重点练习错题和交通标志。
            </p>
          )}
        </div>

        {/* Score Details */}
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-green-100 bg-white p-3 shadow-sm text-center">
            <CheckCircle size={20} className="mx-auto text-green-500 mb-1" />
            <p className="text-2xl font-black text-green-700">{correctCount}</p>
            <p className="text-xs text-zinc-500">答对</p>
          </div>
          <div className="rounded-2xl border border-red-100 bg-white p-3 shadow-sm text-center">
            <XCircle size={20} className="mx-auto text-red-400 mb-1" />
            <p className="text-2xl font-black text-red-500">{wrongCount}</p>
            <p className="text-xs text-zinc-500">答错</p>
          </div>
          <div className="rounded-2xl border border-zinc-100 bg-white p-3 shadow-sm text-center">
            <p className="text-2xl font-black text-zinc-500">{unanswered}</p>
            <p className="text-xs text-zinc-500">未作答</p>
          </div>
          <div
            className={`rounded-2xl border p-3 shadow-sm text-center ${signCorrect >= 2 ? 'border-green-100 bg-white' : 'border-red-100 bg-white'}`}
          >
            <p
              className={`text-2xl font-black ${signCorrect >= 2 ? 'text-green-700' : 'text-red-500'}`}
            >
              {signCorrect} / {signQuestions.length}
            </p>
            <p className="text-xs text-zinc-500">标志题正确</p>
          </div>
        </div>

        {/* Time Used */}
        <div className="mt-3 rounded-2xl border border-zinc-100 bg-white p-3 shadow-sm flex items-center justify-between px-4">
          <p className="text-sm font-medium text-zinc-500">考试用时</p>
          <p className="text-sm font-bold text-zinc-700">{formatTime(examSeconds)}</p>
        </div>

        {/* Pass criteria */}
        <div className="mt-3 rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-zinc-500 mb-2">通过标准</p>
          <div className="space-y-1.5">
            <div className={`flex items-center gap-2 text-sm ${correctCount >= 14 ? 'text-green-700' : 'text-red-500'}`}>
              <span>{correctCount >= 14 ? '✓' : '✗'}</span>
              <span>总答对 ≥ 14 题（当前 {correctCount} 题）</span>
            </div>
            <div className={`flex items-center gap-2 text-sm ${signCorrect >= 2 ? 'text-green-700' : 'text-red-500'}`}>
              <span>{signCorrect >= 2 ? '✓' : '✗'}</span>
              <span>交通标志 ≥ 2 题（当前 {signCorrect} 题）</span>
            </div>
          </div>
        </div>

        {/* Answer Review */}
        <div className="mt-3 rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-zinc-500 mb-3">答题详情</p>
          <div className="space-y-3">
            {questions.map((q, i) => {
              const userAnswer = answers[i]
              const correct = userAnswer === q.answerIndex
              return (
                <div
                  key={q.id}
                  className={`rounded-xl border p-3 ${correct ? 'border-green-100 bg-green-50' : userAnswer === null ? 'border-zinc-100 bg-zinc-50' : 'border-red-100 bg-red-50'}`}
                >
                  <p className="text-xs font-semibold text-zinc-700 break-words whitespace-normal">
                    {i + 1}. {q.question.length > 40 ? q.question.slice(0, 40) + '…' : q.question}
                  </p>
                  <p
                    className={`mt-1 text-xs break-words whitespace-normal ${correct ? 'text-green-600' : userAnswer === null ? 'text-zinc-400' : 'text-red-600'}`}
                  >
                    {userAnswer === null
                      ? '未作答'
                      : correct
                        ? '✓ 正确'
                        : `✗ 你选: ${q.options[userAnswer]?.slice(0, 20)}`}
                  </p>
                  {!correct && userAnswer !== null && (
                    <p className="mt-0.5 text-xs text-green-700 break-words whitespace-normal">正确: {q.answerText}</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={startExam}
            className="flex-1 rounded-2xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-sm active:scale-[0.98]"
          >
            重新考试
          </button>
          <Link
            href="/dmv/ny/wrong-questions"
            className="flex-1 rounded-2xl border border-blue-200 py-3.5 text-center text-sm font-bold text-blue-700 active:scale-[0.98]"
          >
            练习错题
          </Link>
        </div>

        {/* Share */}
        <button
          type="button"
          onClick={handleMockShare}
          className="mt-3 w-full rounded-2xl border border-zinc-200 bg-white py-3 text-sm font-bold text-zinc-700 shadow-sm active:scale-[0.98]"
        >
          📤 分享
        </button>

        {/* Login Banner */}
        {!isLoggedIn && (
          <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <p className="text-sm font-semibold text-blue-800">想保存你的练习进度？</p>
            <p className="mt-1 text-xs text-blue-700 leading-relaxed">
              登录 OpenAA 后，未来可同步错题和学习进度，支持多设备继续学习。
            </p>
            <Link
              href="/auth/login"
              className="mt-3 block rounded-xl bg-blue-600 py-2 text-center text-sm font-medium text-white"
            >
              登录 / 注册
            </Link>
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
      </div>

      {shareToast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 rounded-xl bg-zinc-800 px-4 py-2 text-sm text-white z-50">
          {shareToast}
        </div>
      )}
    </div>
  )
}
