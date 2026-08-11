'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { loginOwner } from '../../lib/auth'

export default function OwnerLogin() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setLoading(true)
    setError('')

    const result = await loginOwner(email, password)

    if (result.error) {
      setError(result.error)
      setLoading(false)
      return
    }

    router.push('/manage/dashboard')
  }

  return (
    <div className="min-h-screen bg-blue-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow p-8 w-full max-w-xs">
        <h1 className="text-2xl font-bold mb-1">🏪 店舗側ログイン</h1>
        <p className="text-gray-400 text-sm mb-6">店長・オーナーの方はこちら</p>

        <div className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700">メールアドレス</label>
            <input
              type="email"
              placeholder="example@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">パスワード</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="パスワード"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-gray-400 text-sm"
              >
                {showPassword ? '隠す' : '表示'}
              </button>
            </div>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            onClick={handleLogin}
            disabled={loading}
            className="bg-blue-600 text-white py-3 rounded-xl font-semibold mt-2 disabled:opacity-50"
          >
            {loading ? 'ログイン中...' : 'ログイン'}
          </button>
        </div>

        <div className="mt-6 text-center">
          <span className="text-sm text-gray-500">アカウントをお持ちでない方は</span>
          <a href="/register/owner" className="text-sm text-blue-600 font-medium ml-1">新規登録</a>
        </div>

        <div className="mt-4 text-center">
          <a href="/" className="text-sm text-gray-400">← トップに戻る</a>
        </div>
      </div>
    </div>
  )
}