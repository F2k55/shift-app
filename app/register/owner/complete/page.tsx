'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { Suspense } from 'react'

function CompleteContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const storeCode = searchParams.get('code')
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    if (storeCode) {
      navigator.clipboard.writeText(storeCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="min-h-screen bg-blue-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow p-8 w-full max-w-xs text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h1 className="text-2xl font-bold mb-2">登録完了！</h1>
        <p className="text-gray-400 text-sm mb-6">店舗コードをスタッフに共有してください</p>

        <div className="bg-blue-50 rounded-xl p-4 mb-3">
          <p className="text-sm text-gray-500 mb-1">店舗コード</p>
          <p className="text-3xl font-bold text-blue-600 tracking-widest">{storeCode}</p>
        </div>

        <button
          onClick={handleCopy}
          className="w-full border border-blue-300 text-blue-600 py-2 rounded-xl text-sm font-semibold mb-6"
        >
          {copied ? '✅ コピーしました！' : '📋 コピーする'}
        </button>

        <p className="text-xs text-gray-400 mb-6">
          このコードはいつでもダッシュボードから確認できます
        </p>

        <button
          onClick={() => router.push('/manage/dashboard')}
          className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold"
        >
          ダッシュボードへ
        </button>
      </div>
    </div>
  )
}

export default function OwnerRegisterComplete() {
  return (
    <Suspense>
      <CompleteContent />
    </Suspense>
  )
}
