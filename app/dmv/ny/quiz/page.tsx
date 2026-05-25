'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, RotateCcw } from 'lucide-react'
import DetailBackButton from '@/components/DetailBackButton'
import { supabase } from '@/lib/supabase'
import { toAbsoluteUrl } from '@/lib/site'
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

function getWrongIds(): string[] {
  try {
    const stored = localStorage.getItem(WRONG_QUESTIONS_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function saveWrongQuestionId(id: string) {
  try {
    const ids = getWrongIds()
    if (!ids.includes(id)) {
      ids.push(id)
      localStorage.setItem(WRONG_QUESTIONS_KEY, JSON.stringify(ids))
    }
  } catch {}
}

function removeWrongQuestionId(id: string) {
  try {
    const ids = getWrongIds().filter((x) => x !== id)
    localStorage.setItem(WRONG_QUESTIONS_KEY, JSON.stringify(ids))
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

type Mode = 'setup' | 'practice' | 'done'

type OrderMode = 'random' | 'sequential'

type CountOption = 10 | 20 | 30 | 50 | 'all'

function pickCount(list: Question[], count: CountOption): Question[] {
  if (count === 'all') return list
  return list.slice(0, count)
}

export default function DMVQuizPage() {
  const [mode, setMode] = useState<Mode>('setup')
  const [order, setOrder] = useState<OrderMode>('random')
  const [count, setCount] = useState<CountOption>(20)

  const [questions, setQuestions] = useState<Question[]>([])
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [answered, setAnswered] = useState(false)
  const [score, setScore] = useState({ correct: 0, wrong: 0 })

  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [shareToast, setShareToast] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setIsLoggedIn(!!data.user))
  }, [])

  useEffect(() => {
    addRecentView({
      type: 'dmv',
      id: 'dmv-ny-quiz',
      title: '纽约 DMV 随机 / 顺序练习',
      url: '/dmv/ny/quiz',
      summary: '全题库随机或顺序练习',
    })
  }, [])

  const totalQuestions = useMemo(() => allQuestions.length, [])

  const start = useCallback(() => {
    const base = order === 'random' ? shuffle(allQuestions) : [...allQuestions]
    const picked = pickCount(base, count)
    setQuestions(picked)
    setCurrent(0)
    setSelected(null)
    setAnswered(false)
    setScore({ correct: 0, wrong: 0 })
    setMode('practice')
  }, [order, count])

  const q = questions[current]

  const handleSelect = useCallback(
    (i: number) => {
      if (answered || !q) return
      setSelected(i)
      setAnswered(true)

      if (i === q.answerIndex) {
        setScore((s) => ({ ...s, correct: s.correct + 1 }))
        removeWrongQuestionId(String(q.id))
      } else {
        setScore((s) => ({ ...s, wrong: s.wrong + 1 }))
        saveWrongQuestionId(String(q.id))
      }
    },
    [answered, q],
  )

  const handleNext = useCallback(() => {
    if (current >= questions.length - 1) {
      setMode('done')
      return
    }
    setCurrent((c) => c + 1)
    setSelected(null)
    setAnswered(false)
  }, [current, questions.length])

  const handlePrev = useCallback(() => {
    if (current <= 0) return
    setCurrent((c) => c - 1)
    setSelected(null)
    setAnswered(false)
  }, [current])

  const restart = useCallback(() => {
    start()
  }, [start])

  // Guards (after hooks)
  if (mode === 'practice' && questions.length === 0) {
    return (
      <div className="min-h-screen bg-zinc-50 pb-28">
        <div className="px-4 pt-4">
          <DetailBackButton fallbackHref="/dmv/ny/practice" />
        </div>
        <div className="px-4 pt-4">
          <div className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-zinc-900">暂无题目，请检查题库。</p>
          </div>
        </div>
      </div>
    )
  }

  if (mode === 'practice' && !q) {
    return (
      <div className="min-h-screen bg-zinc-50 pb-28">
        <div className="px-4 pt-4">
          <DetailBackButton fallbackHref="/dmv/ny/practice" />
        </div>
        <div className="px-4 pt-4">
          <div className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-zinc-900">题目加载异常，请重新开始练习。</p>
          </div>
          <button
            type="button"
            onClick={() => setMode('setup')}
            className="mt-4 w-full rounded-2xl bg-blue-600 py-3.5 text-sm font-bold text-white"
          >
            返回设置
          </button>
        </div>
      </div>
    )
  }

  if (mode === 'done') {
    const total = score.correct + score.wrong
    const rate = total === 0 ? 0 : Math.round((score.correct / total) * 100)
    const practiceUrl = toAbsoluteUrl('/dmv/ny/practice')

    const handleShare = async () => {
      const text = `我在 OpenAA DMV 中文笔试练习中答对了 ${score.correct}/${total} 题（正确率 ${rate}%）！\n快来一起刷题吧 🚗\n\n${practiceUrl}`
      if (typeof navigator !== 'undefined' && navigator.share) {
        try {
          await navigator.share({ title: 'OpenAA DMV 中文笔试练习', text })
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
        <div className="px-4 pt-4">
          <DetailBackButton fallbackHref="/dmv/ny/practice" />
          <h1 className="mb-4 text-base font-bold text-zinc-900">练习结果</h1>

          <div className="rounded-2xl border border-blue-100 bg-gradient-to-b from-blue-50 to-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-zinc-700">本次练习</p>
            <div className="mt-3 grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-green-100 bg-white p-3 text-center shadow-sm">
                <p className="text-2xl font-black text-green-700">{score.correct}</p>
                <p className="text-xs text-zinc-500">正确</p>
              </div>
              <div className="rounded-2xl border border-red-100 bg-white p-3 text-center shadow-sm">
                <p className="text-2xl font-black text-red-500">{score.wrong}</p>
                <p className="text-xs text-zinc-500">错误</p>
              </div>
              <div className="rounded-2xl border border-zinc-100 bg-white p-3 text-center shadow-sm">
                <p className="text-2xl font-black text-blue-700">{rate}%</p>
                <p className="text-xs text-zinc-500">正确率</p>
              </div>
            </div>

            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={restart}
                className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3.5 text-sm font-bold text-white"
              >
                <RotateCcw size={16} />
                再来一次
              </button>
              <Link
                href="/dmv/ny/wrong-questions"
                className="flex-1 rounded-2xl border border-blue-200 py-3.5 text-center text-sm font-bold text-blue-700"
              >
                去错题练习
              </Link>
            </div>

            <button
              type="button"
              onClick={handleShare}
              className="mt-3 w-full rounded-2xl border border-zinc-200 bg-white py-3 text-sm font-bold text-zinc-700"
            >
              📤 分享
            </button>
          </div>

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

  if (mode === 'setup') {
    return (
      <div className="min-h-screen bg-zinc-50 pb-28">
        <div className="px-4 pt-4">
          <DetailBackButton fallbackHref="/dmv/ny/practice" />
        </div>

        <div className="px-4 pt-4">
          <section className="rounded-2xl border border-blue-100 bg-gradient-to-b from-blue-50 to-white p-4 shadow-sm">
            <h1 className="text-xl font-black text-zinc-900">随机 / 顺序练习</h1>
            <p className="mt-2 text-sm text-zinc-600 leading-relaxed">
              使用完整题库练习：随机或顺序；支持选择题数。
            </p>
            <p className="mt-1 text-xs text-zinc-400">当前题库：{totalQuestions} 题</p>
          </section>

          <section className="mt-4 rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm">
            <div className="flex gap-3">
              <div className="flex-1">
                <p className="mb-1.5 text-xs font-semibold text-zinc-500">练习模式</p>
                <select
                  value={order}
                  onChange={(e) => setOrder(e.target.value as OrderMode)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1976d2]"
                >
                  <option value="random">随机练习</option>
                  <option value="sequential">顺序练习</option>
                </select>
              </div>
              <div className="flex-1">
                <p className="mb-1.5 text-xs font-semibold text-zinc-500">题数</p>
                <select
                  value={String(count)}
                  onChange={(e) => {
                    const v = e.target.value
                    setCount(v === 'all' ? 'all' : (Number(v) as CountOption))
                  }}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1976d2]"
                >
                  <option value="10">10题</option>
                  <option value="20">20题</option>
                  <option value="30">30题</option>
                  <option value="50">50题</option>
                  <option value="all">全部题目</option>
                </select>
              </div>
            </div>
          </section>

          <button
            type="button"
            onClick={start}
            className="mt-4 w-full rounded-2xl bg-blue-600 py-4 text-base font-bold text-white shadow-sm active:scale-[0.98]"
          >
            开始练习
          </button>

          <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
            <p className="text-xs font-semibold text-amber-900">提示</p>
            <p className="mt-1 text-xs leading-relaxed text-amber-900">
              交通标志专项练习请前往「交通标志专项」页面。
            </p>
            <Link href="/dmv/ny/sign-test" className="mt-2 inline-block text-xs font-bold text-blue-700">
              去交通标志专项 →
            </Link>
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

  // practice mode
  const progress = ((current + 1) / questions.length) * 100
  const isCorrect = answered && selected === q.answerIndex

  return (
    <div className="min-h-screen bg-zinc-50 pb-28">
      {/* Progress */}
      <div className="sticky top-14 z-40 bg-white shadow-sm">
        <div className="flex h-1.5 w-full bg-zinc-100">
          <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex items-center justify-between px-4 py-2">
          <button
            type="button"
            onClick={() => setMode('setup')}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-zinc-500"
          >
            <ArrowLeft size={16} />
          </button>
          <span className="text-sm font-semibold text-zinc-700">
            {current + 1} / {questions.length}
          </span>
          <span className="text-xs text-zinc-400">练习</span>
        </div>
      </div>

      <div className="px-4 pt-4">
        {/* Question Card */}
        <div className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600 font-medium">
              第 {current + 1} 题
            </span>
            <span className="rounded-full bg-zinc-50 px-2 py-0.5 text-xs text-zinc-500">{q.category}</span>
          </div>

          <p className="mt-2 text-base font-semibold leading-relaxed text-zinc-900">{q.question}</p>

          {q.image && (
            <div className="mt-3 flex justify-center">
              <img src={q.image} alt="题目图片" className="h-44 w-44 rounded-xl object-contain" />
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
          <button
            type="button"
            onClick={handlePrev}
            disabled={current === 0}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-500 disabled:opacity-30"
          >
            <ArrowLeft size={16} />
          </button>

          {answered ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-sm active:scale-[0.98]"
            >
              {current >= questions.length - 1 ? '完成练习' : '下一题'}
              <ArrowRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              onClick={restart}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-400"
            >
              <RotateCcw size={16} />
            </button>
          )}
        </div>

        {/* Helper links */}
        <div className="mt-3 flex gap-2">
          <Link
            href="/dmv/ny/questions"
            className="flex-1 rounded-2xl border border-zinc-200 bg-white py-3 text-center text-sm font-bold text-zinc-700"
          >
            查看题库
          </Link>
          <Link
            href="/dmv/ny/wrong-questions"
            className="flex-1 rounded-2xl border border-red-100 bg-white py-3 text-center text-sm font-bold text-red-500"
          >
            错题本
          </Link>
        </div>
      </div>
    </div>
  )
}
