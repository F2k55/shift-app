'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { registerStaff } from '../../lib/auth'

export default function StaffRegister() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleRegister = async () => {
    setLoading(true)
    setError('')

    const result = await registerStaff(name, email, password)

    if (result.error) {
      setError(result.error)
      setLoading(false)
      return
    }

    router.push('/store-select')
  }

  return (
    <div className="min-h-screen bg-blue-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow p-8 w-full max-w-xs">
        <h1 className="text-2xl font-bold mb-1">👤 新規登録</h1>
        <p className="text-gray-400 text-sm mb-6">アカウント情報を入力してください</p>

        <div className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700">名前</label>
            <input
              type="text"
              placeholder="例：山田 太郎"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
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

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            onClick={handleRegister}
            disabled={loading}
            className="bg-green-500 text-white py-3 rounded-xl font-semibold mt-2 disabled:opacity-50"
          >
            {loading ? '登録中...' : '登録する'}
          </button>
        </div>

        <div className="mt-6 text-center">
          <span className="text-sm text-gray-500">すでにアカウントをお持ちの方は</span>
          <a href="/login/staff" className="text-sm text-green-600 font-medium ml-1">ログイン</a>
        </div>

        <div className="mt-4 text-center">
          <a href="/" className="text-sm text-gray-400">← トップに戻る</a>
        </div>
      </div>
    </div>
  )
}