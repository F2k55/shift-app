'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { loginStaff } from '../../lib/auth'

export default function StaffLogin() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const savedEmail = localStorage.getItem('staff_email')
    if (savedEmail) {
      setEmail(savedEmail)
      setRememberMe(true)
    }
  }, [])

  const handleLogin = async () => {
    setLoading(true)
    setError('')

    const result = await loginStaff(email, password)

    if (result.error) {
      setError(result.error)
      setLoading(false)
      return
    }

    if (rememberMe) {
      localStorage.setItem('staff_email', email)
    } else {
      localStorage.removeItem('staff_email')
    }

    router.push('/store-select')
  }

  return (
    <div className="min-h-screen bg-blue-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow p-8 w-full max-w-xs">
        <h1 className="text-2xl font-bold mb-1">👤 スタッフログイン</h1>
        <p className="text-gray-400 text-sm mb-6">アルバイトの方はこちら</p>

        <div className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700">メールアドレス</label>
            <input
              type="email"
              placeholder="example@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
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
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-gray-400 text-sm"
              >
                {showPassword ? '隠す' : '表示'}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="rememberMe"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 accent-green-500"
            />
            <label htmlFor="rememberMe" className="text-sm text-gray-600">メールアドレスを記憶する</label>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            onClick={handleLogin}
            disabled={loading}
            className="bg-green-500 text-white py-3 rounded-xl font-semibold mt-2 disabled:opacity-50"
          >
            {loading ? 'ログイン中...' : 'ログイン'}
          </button>
        </div>

        <div className="mt-6 text-center">
          <span className="text-sm text-gray-500">アカウントをお持ちでない方は</span>
          <a href="/register/staff" className="text-sm text-green-600 font-medium ml-1">新規登録</a>
        </div>

        <div className="mt-4 text-center">
          <a href="/" className="text-sm text-gray-400">← トップに戻る</a>
        </div>
      </div>
    </div>
  )
}