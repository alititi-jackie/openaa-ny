'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signInWithEmail } from '@/lib/auth'
import GoogleLoginButton from './GoogleLoginButton'

export default function LoginForm({ redirectPath = '/profile' }: { redirectPath?: string }) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await signInWithEmail(email, password)
    if (error) {
      setError('邮箱或密码错误，请重试')
      setLoading(false)
      return
    }

    router.push(redirectPath)
    router.refresh()
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 w-full max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-center text-gray-900">登录 OpenAA</h1>

      {/* Guidance message */}
      <div className="mt-3 mb-6 text-center">
        <p className="text-[13.5px] leading-relaxed text-zinc-500">
          登录后即可免费发布二手商品、招聘信息，管理您的内容并享受更多OpenAA服务。
        </p>
        <p className="mt-1 text-[12px] text-zinc-400">
          Login to post listings, jobs and manage your OpenAA account.
        </p>
      </div>

      {/* Google OAuth login (re-use existing Supabase signInWithOAuth flow) */}
      <GoogleLoginButton redirectPath={redirectPath} />

      <div className="flex items-center gap-3 my-4">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400">或</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 text-red-600 rounded-lg p-3 text-sm">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            邮箱地址
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="your@email.com"
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1976d2] focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            密码
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="请输入密码"
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1976d2] focus:border-transparent"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#1976d2] text-white py-2.5 rounded-lg font-medium hover:bg-[#1565c0] transition disabled:opacity-50"
        >
          {loading ? '登录中...' : '登录'}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-3">
        <Link href="/auth/forgot-password" className="text-[#1976d2] hover:underline">
          忘记密码？
        </Link>
      </p>

      <p className="text-center text-sm text-gray-600 mt-4">
        还没有账号？{' '}
        <Link href="/auth/signup" className="text-[#1976d2] hover:underline font-medium">
          立即注册
        </Link>
      </p>
    </div>
  )
}
