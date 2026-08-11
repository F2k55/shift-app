'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '../../lib/supabase'
import { logout } from '../../lib/auth'
import { Suspense } from 'react'

const getThemeBg = () => {
  if (typeof window === 'undefined') return 'bg-blue-50'
  const theme = localStorage.getItem('staff-theme') || 'ocean'
  if (theme === 'simple') return 'bg-gray-100'
  if (theme === 'sakura') return 'bg-pink-50'
  return 'bg-blue-50'
}

function SettingsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const storeId = searchParams.get('store')

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [theme, setTheme] = useState('ocean')
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)
  const [stores, setStores] = useState<any[]>([])
  const [staffId, setStaffId] = useState('')
  const [bgColor, setBgColor] = useState('bg-blue-50')

  useEffect(() => {
    setBgColor(getThemeBg())
    const savedTheme = localStorage.getItem('staff-theme') || 'ocean'
    setTheme(savedTheme)
    fetchData()
  }, [])

  const fetchData = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: staffData } = await supabase
      .from('staff')
      .select('id, name, email')
      .eq('user_id', user.id)
      .maybeSingle()

    if (staffData) {
      setName(staffData.name)
      setEmail(staffData.email)
      setStaffId(staffData.id)

      const { data: staffStores } = await supabase
        .from('staff_stores')
        .select('store_id')
        .eq('staff_id', staffData.id)

      if (staffStores && staffStores.length > 0) {
        const storeIds = staffStores.map((s: any) => s.store_id)
        const { data: storesData } = await supabase
          .from('stores')
          .select('*')
          .in('id', storeIds)
        if (storesData) setStores(storesData)
      }
    }
  }

  const handleSave = async () => {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase
      .from('staff')
      .update({ name })
      .eq('user_id', user.id)

    localStorage.setItem('staff-theme', theme)
    setBgColor(getThemeBg())
    setLoading(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleLeaveStore = async (leaveStoreId: string) => {
    const supabase = createClient()
    await supabase
      .from('staff_stores')
      .delete()
      .eq('staff_id', staffId)
      .eq('store_id', leaveStoreId)

    if (leaveStoreId === storeId) {
      router.push('/store-select')
    } else {
      fetchData()
    }
  }

  const handleLogout = async () => {
    await logout()
    router.push('/')
  }

  const THEMES = [
    { id: 'ocean', name: 'オーシャン', selectedBg: 'bg-blue-100 border-blue-400 text-blue-700' },
    { id: 'simple', name: 'シンプル', selectedBg: 'bg-gray-300 border-gray-500 text-gray-800' },
    { id: 'sakura', name: 'サクラ', selectedBg: 'bg-pink-100 border-pink-400 text-pink-600' },
  ]

  return (
    <div className={`min-h-screen ${bgColor}`}>
      <div className="bg-white shadow-sm px-4 py-4 flex items-center gap-3">
        <button onClick={() => router.push(`/staff/home?store=${storeId}`)} className="text-gray-400">←</button>
        <h1 className="text-xl font-bold">⚙️ 設定</h1>
      </div>

      <div className="p-4 max-w-sm mx-auto flex flex-col gap-4">

        {/* プロフィール */}
        <div className="bg-white rounded-2xl shadow p-4">
          <h2 className="text-sm font-medium text-gray-500 mb-3">プロフィール</h2>
          <div className="flex flex-col gap-3">
            <div>
              <p className="text-xs text-gray-400 mb-1">名前</p>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">メールアドレス</p>
              <p className="text-sm text-gray-600 px-3 py-2 bg-gray-50 rounded-lg">{email}</p>
            </div>
          </div>
        </div>

        {/* テーマ切り替え */}
        <div className="bg-white rounded-2xl shadow p-4">
          <h2 className="text-sm font-medium text-gray-500 mb-3">テーマ</h2>
          <div className="flex gap-2">
            {THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setTheme(t.id)
                  localStorage.setItem('staff-theme', t.id)
                  setBgColor(getThemeBg())
                }}
                className={`flex-1 py-3 rounded-xl text-sm font-semibold border ${
                  theme === t.id
                    ? t.selectedBg
                    : 'border-gray-200 text-gray-500'
                }`}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>

        {/* 登録店舗一覧 */}
        <div className="bg-white rounded-2xl shadow p-4">
          <h2 className="text-sm font-medium text-gray-500 mb-3">登録店舗</h2>
          {stores.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-2">店舗がありません</p>
          )}
          <div className="flex flex-col gap-2">
            {stores.map((store: any) => (
              <div key={store.id} className="flex items-center justify-between bg-blue-50 rounded-xl px-3 py-2">
                <div>
                  <p className="text-sm font-semibold">{store.name}</p>
                  {store.sub_name && <p className="text-xs text-gray-400">{store.sub_name}</p>}
                </div>
                <button
                  onClick={() => handleLeaveStore(store.id)}
                  className="text-xs text-red-400 border border-red-200 px-2 py-1 rounded-lg"
                >
                  退店
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* 保存ボタン */}
        <button
          onClick={handleSave}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold disabled:opacity-50"
        >
          {saved ? '✅ 保存しました！' : loading ? '保存中...' : '保存する'}
        </button>

        {/* ログアウト */}
        <button
          onClick={handleLogout}
          className="w-full border border-red-300 text-red-400 py-3 rounded-xl font-semibold"
        >
          ログアウト
        </button>

      </div>
    </div>
  )
}

export default function StaffSettings() {
  return (
    <Suspense>
      <SettingsContent />
    </Suspense>
  )
}