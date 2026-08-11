'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase'
import { logout } from '../../lib/auth'

export default function Dashboard() {
  const router = useRouter()
  const [staffCount, setStaffCount] = useState(0)
  const [unsubmittedCount, setUnsubmittedCount] = useState(0)
  const [shortageCount, setShortageCount] = useState(0)
  const [todayCount, setTodayCount] = useState(0)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: owner } = await supabase
      .from('owners')
      .select('store_id')
      .eq('user_id', user.id)
      .single()

    if (!owner) return
    const storeId = owner.store_id

    const { data: staffStores } = await supabase
      .from('staff_stores')
      .select('staff_id')
      .eq('store_id', storeId)

    if (staffStores) setStaffCount(staffStores.length)

    const year = new Date().getFullYear()
    const month = new Date().getMonth()
    const { data: requests } = await supabase
      .from('shift_requests')
      .select('staff_id')
      .eq('store_id', storeId)
      .gte('date', `${year}-${String(month + 1).padStart(2, '0')}-01`)
      .lte('date', `${year}-${String(month + 1).padStart(2, '0')}-${new Date(year, month + 1, 0).getDate()}`)

    if (requests && staffStores) {
      const submittedStaffIds = [...new Set(requests.map((r: any) => r.staff_id))]
      setUnsubmittedCount(staffStores.length - submittedStaffIds.length)
    }

    const today = new Date().toISOString().slice(0, 10)
    const { data: todayShifts } = await supabase
      .from('shifts')
      .select('id')
      .eq('store_id', storeId)
      .eq('date', today)

    if (todayShifts) setTodayCount(todayShifts.length)
  }

  const handleLogout = async () => {
    await logout()
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-blue-50">
      <div className="bg-white shadow-sm px-8 py-5 flex items-center justify-between">
        <h1 className="text-2xl font-bold">ダッシュボード</h1>
        <button onClick={handleLogout} className="text-sm text-gray-400">ログアウト</button>
      </div>

      <div className="p-8 h-[calc(100vh-73px)]">
        <div className="grid grid-cols-3 gap-6 h-full">

          {/* 左カラム */}
          <div className="flex flex-col gap-6">
            <div className="bg-white rounded-2xl shadow p-8 flex-1">
              <h2 className="text-base font-medium text-gray-500 mb-6">📊 今月のシフト状況</h2>
              <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <p className="text-base text-gray-600">スタッフ数</p>
                  <p className="text-3xl font-bold text-blue-600">{staffCount}人</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-base text-gray-600">未提出</p>
                  <p className="text-3xl font-bold text-orange-400">{unsubmittedCount}人</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-base text-gray-600">人員不足日</p>
                  <p className="text-3xl font-bold text-red-500">{shortageCount}日</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow p-8 flex-1">
              <h2 className="text-base font-medium text-gray-500 mb-6">📅 今日の状況</h2>
              <div className="flex items-center justify-between">
                <p className="text-base text-gray-600">出勤予定</p>
                <p className="text-3xl font-bold text-blue-600">{todayCount}人</p>
              </div>
            </div>
          </div>

          {/* 中カラム */}
          <div className="flex flex-col gap-6">
            <button
              onClick={() => router.push('/manage/shifts')}
              className="bg-white rounded-2xl shadow p-8 text-left hover:bg-blue-50 flex-1 flex flex-col justify-center"
            >
              <div className="text-5xl mb-4">📅</div>
              <p className="text-xl font-bold">シフト管理</p>
              <p className="text-sm text-gray-400 mt-2">振り分け・確認・公開</p>
            </button>
            <button
              onClick={() => router.push('/manage/staff')}
              className="bg-white rounded-2xl shadow p-8 text-left hover:bg-blue-50 flex-1 flex flex-col justify-center"
            >
              <div className="text-5xl mb-4">👥</div>
              <p className="text-xl font-bold">スタッフ一覧</p>
              <p className="text-sm text-gray-400 mt-2">役割管理</p>
            </button>
          </div>

          {/* 右カラム */}
          <div className="flex flex-col gap-6">
            <button
              onClick={() => router.push('/manage/manual')}
              className="bg-white rounded-2xl shadow p-8 text-left hover:bg-blue-50 flex-1 flex flex-col justify-center"
            >
              <div className="text-5xl mb-4">📚</div>
              <p className="text-xl font-bold">マニュアル管理</p>
              <p className="text-sm text-gray-400 mt-2">カテゴリ・内容管理</p>
            </button>
            <button
              onClick={() => router.push('/manage/notifications')}
              className="bg-white rounded-2xl shadow p-8 text-left hover:bg-blue-50 flex-1 flex flex-col justify-center"
            >
              <div className="text-5xl mb-4">📢</div>
              <p className="text-xl font-bold">お知らせ送信</p>
              <p className="text-sm text-gray-400 mt-2">全体・個人向け</p>
            </button>
            <button
              onClick={() => router.push('/manage/settings')}
              className="bg-white rounded-2xl shadow p-8 text-left hover:bg-blue-50 flex-1 flex flex-col justify-center"
            >
              <div className="text-5xl mb-4">⚙️</div>
              <p className="text-xl font-bold">設定</p>
              <p className="text-sm text-gray-400 mt-2">営業時間・必要人数</p>
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}