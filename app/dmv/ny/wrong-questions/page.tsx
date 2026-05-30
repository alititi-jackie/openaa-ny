'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Trash2 } from 'lucide-react'
import DetailBackButton from '@/components/DetailBackButton'
import { supabase } from '@/lib/supabase'
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

function removeWrongId(id: string) {
  try {
    const ids = getWrongIds().filter((x) => x !== id)
    localStorage.setItem(WRONG_QUESTIONS_KEY, JSON.stringify(ids))
  } catch {}
}

function clearAllWrong() {
  try {
    localStorage.setItem(WRONG_QUESTIONS_KEY, JSON.stringify([]))
  } catch {}
}

type Mode = 'list' | 'practice' | 'done'

export default function WrongQuestionsPage() {
  const [wrongIds, setWrongIds] = useState<string[]>([])
  const [onlySign, setOnlySign] = useState(false)
  const [mode, setMode] = useState<Mode>('list')
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [answered, setAnswered] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [showConfirmClear, setShowConfirmClear] = useState(false)

  useEffect(() => {
    setWrongIds(getWrongIds())
    supabase.auth.getUser().then(({ data }) => setIsLoggedIn(!!data.user))
  }, [])

  useEffect(() => {
    addRecentView({
      type: 'dmv',
      id: 'dmv-ny-wrong-questions',
      title: '纽约 DMV 错题练习',
      url: '/dmv/ny/wrong-questions',
      summary: '自动汇总错题并集中练习',
    })
  }, [])

  const wrongQuestions = allQuestions.filter((q) => wrongIds.includes(String(q.id)))
  const filtered = onlySign
    ? wrongQuestions.filter((q) => q.category === '交通标志')
    : wrongQuestions

  const q = filtered[current]

  const startPractice = useCallback(() => {
    if (filtered.length === 0) return
    setCurrent(0)
    setSelected(null)
    setAnswered(false)
    setMode('practice')
  }, [filtered.length])

  const handleSelect = useCallback(
    (i: number) => {
      if (answered) return
      setSelected(i)
      setAnswered(true)
    },
    [answered],
  )

  const handleNext = useCallback(() => {
    const isCorrect = selected === q.answerIndex
    if (isCorrect) {
      removeWrongId(String(q.id))
      setWrongIds((prev) => prev.filter((id) => id !== String(q.id)))
    }
    const remaining = filtered.filter((fq) => {
      if (isCorrect && fq.id === q.id) return false
      return true
    })
    if (remaining.length === 0 || current >= remaining.length - 1) {
      setMode('done')
    } else {
      setCurrent((c) => Math.min(c, remaining.length - 1))
      setSelected(null)
      setAnswered(false)
    }
  }, [selected, q, filtered, current])

  const handleClearAll = useCallback(() => {
    clearAllWrong()
    setWrongIds([])
    setShowConfirmClear(false)
    setMode('list')
  }, [])

  if (mode === 'done') {
    return (
      <div className="min-h-screen bg-zinc-50 pb-28">
        <div className="px-4 pt-4">
          <DetailBackButton fallbackHref="/dmv/ny/practice" />
          <h1 className="mb-4 text-base font-bold text-zinc-900">错题练习</h1>

          <div className="rounded-2xl border border-green-200 bg-gradient-to-b from-green-50 to-white p-6 text-center shadow-sm">
            <div className="text-5xl mb-3">🎊</div>
            <p className="text-xl font-black text-green-800">太棒了！</p>
            <p className="mt-2 text-sm text-green-700">本次错题全部练习完成</p>
          </div>

          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={() => {
                setWrongIds(getWrongIds())
                setMode('list')
              }}
              className="flex-1 rounded-2xl bg-blue-600 py-3.5 text-sm font-bold text-white"
            >
              返回错题本
            </button>
            <Link
              href="/dmv/ny/mock-test"
              className="flex-1 rounded-2xl border border-blue-200 py-3.5 text-center text-sm font-bold text-blue-700"
            >
              去模拟考试
            </Link>
          </div>

          {!isLoggedIn && (
            <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <p className="text-sm font-semibold text-blue-800">坚持练习！</p>
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
        </div>
      </div>
    )
  }

  if (mode === 'practice' && q) {
    const isCorrect = selected === q.answerIndex
    const progress = ((current + 1) / filtered.length) * 100

    return (
      <div className="min-h-screen bg-zinc-50 pb-28">
        {/* Progress */}
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
              onClick={() => setMode('list')}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-zinc-500"
            >
              <ArrowLeft size={16} />
            </button>
            <span className="text-sm font-semibold text-zinc-700">
              {current + 1} / {filtered.length}
            </span>
            <span className="text-xs text-zinc-400">错题练习</span>
          </div>
        </div>

        <div className="px-4 pt-4">
          <div className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center gap-2">
              <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-500 font-medium">
                错题 {current + 1}
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

            {answered && (
              <div
                className={`mt-3 rounded-xl border px-3 py-2 ${isCorrect ? 'border-green-100 bg-green-50' : 'border-red-100 bg-red-50'}`}
              >
                {isCorrect ? (
                  <>
                    <p className="text-xs font-semibold text-green-700">✓ 回答正确！将从错题本移除</p>
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

          {answered && (
            <button
              type="button"
              onClick={handleNext}
              className="mt-4 w-full flex items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-sm active:scale-[0.98]"
            >
              {current >= filtered.length - 1 || (isCorrect && filtered.length <= 1)
                ? '完成练习'
                : '下一题'}
              <ArrowRight size={16} />
            </button>
          )}
        </div>
      </div>
    )
  }

  // List mode
  return (
    <div className="min-h-screen bg-zinc-50 pb-28">
      <div className="px-4 pt-4">
        <DetailBackButton fallbackHref="/dmv/ny/practice" />
        <h1 className="mb-4 text-base font-bold text-zinc-900">错题练习</h1>

        {wrongQuestions.length === 0 ? (
          <div className="rounded-2xl border border-zinc-100 bg-white p-8 text-center shadow-sm">
            <div className="text-5xl mb-3">🎯</div>
            <p className="text-base font-bold text-zinc-800">错题本是空的</p>
            <p className="mt-2 text-sm text-zinc-500">
              做题时答错的题目会自动保存到这里
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <Link
                href="/dmv/ny/questions"
                className="rounded-2xl bg-blue-600 py-3 text-center text-sm font-bold text-white"
              >
                去查看题库
              </Link>
              <Link
                href="/dmv/ny/mock-test"
                className="rounded-2xl border border-blue-200 py-3 text-center text-sm font-bold text-blue-700"
              >
                去模拟考试
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="rounded-2xl border border-red-100 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-black text-red-500">{wrongQuestions.length}</p>
                  <p className="text-xs text-zinc-500">道错题</p>
                </div>
                <div>
                  <p className="text-2xl font-black text-orange-500">
                    {wrongQuestions.filter((q) => q.category === '交通标志').length}
                  </p>
                  <p className="text-xs text-zinc-500">道标志错题</p>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="mt-3 flex flex-nowrap gap-2 overflow-x-auto overflow-y-hidden py-1 [touch-action:pan-x] [overscroll-behavior-x:contain] [overscroll-behavior-y:contain]">
              <button
                type="button"
                onClick={() => setOnlySign(false)}
                className={`inline-flex min-h-10 flex-1 items-center justify-center rounded-xl py-2 text-sm font-medium leading-none transition-colors ${!onlySign ? 'bg-blue-600 text-white' : 'border border-zinc-200 bg-white text-zinc-600'}`}
              >
                全部错题 ({wrongQuestions.length})
              </button>
              <button
                type="button"
                onClick={() => setOnlySign(true)}
                className={`inline-flex min-h-10 flex-1 items-center justify-center rounded-xl py-2 text-sm font-medium leading-none transition-colors ${onlySign ? 'bg-blue-600 text-white' : 'border border-zinc-200 bg-white text-zinc-600'}`}
              >
                标志错题 ({wrongQuestions.filter((q) => q.category === '交通标志').length})
              </button>
            </div>

            {/* Actions */}
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={startPractice}
                disabled={filtered.length === 0}
                className="flex-1 rounded-2xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-sm disabled:opacity-50 active:scale-[0.98]"
              >
                开始练习 ({filtered.length} 题)
              </button>
              <button
                type="button"
                onClick={() => setShowConfirmClear(true)}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-red-100 bg-white text-red-400"
              >
                <Trash2 size={18} />
              </button>
            </div>

            {/* Error list preview */}
            <div className="mt-3 space-y-2">
              {filtered.slice(0, 10).map((wq, i) => (
                <div
                  key={wq.id}
                  className="rounded-xl border border-zinc-100 bg-white px-4 py-3 shadow-sm"
                >
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 shrink-0 rounded-full bg-red-50 px-1.5 py-0.5 text-xs text-red-400">
                      {i + 1}
                    </span>
                    <p className="text-sm text-zinc-700 line-clamp-2">{wq.question}</p>
                  </div>
                  <p className="mt-1 ml-6 text-xs text-zinc-400">{wq.category}</p>
                </div>
              ))}
              {filtered.length > 10 && (
                <p className="text-center text-xs text-zinc-400">还有 {filtered.length - 10} 道错题…</p>
              )}
            </div>
          </>
        )}
      </div>

      <div className="mt-6 flex justify-center pb-2 px-4">
        <Link
          href="/dmv/ny/practice"
          className="rounded-2xl border border-red-100 bg-red-50 px-6 py-2.5 text-sm font-medium text-red-500"
        >
          退出练习
        </Link>
      </div>

      {/* Confirm Clear Dialog */}
      {showConfirmClear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <p className="text-base font-bold text-zinc-900">清空错题本？</p>
            <p className="mt-2 text-sm text-zinc-500">此操作不可撤销，所有错题记录将被删除。</p>
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={handleClearAll}
                className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-bold text-white"
              >
                确认清空
              </button>
              <button
                type="button"
                onClick={() => setShowConfirmClear(false)}
                className="flex-1 rounded-xl border border-zinc-200 py-2.5 text-sm font-medium text-zinc-600"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
