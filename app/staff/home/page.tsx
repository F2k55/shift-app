'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '../../lib/supabase'
import { Suspense } from 'react'

const getThemeBg = () => {
  if (typeof window === 'undefined') return 'bg-blue-50'
  const theme = localStorage.getItem('staff-theme') || 'ocean'
  if (theme === 'simple') return 'bg-gray-100'
  if (theme === 'sakura') return 'bg-pink-50'
  return 'bg-blue-50'
}

function HomeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const storeId = searchParams.get('store')
  const [storeName, setStoreName] = useState('')
  const [staffName, setStaffName] = useState('')
  const [notifications, setNotifications] = useState<any[]>([])
  const [bgColor, setBgColor] = useState('bg-blue-50')
  const [plannedHours, setPlannedHours] = useState(0)

  useEffect(() => {
    setBgColor(getThemeBg())
    fetchData()
  }, [])

  const fetchData = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: staff } = await supabase
      .from('staff')
      .select('id, name')
      .eq('user_id', user.id)
      .single()

    if (staff) {
      setStaffName(staff.name)

      const { data: notifData } = await supabase
        .from('notifications')
        .select('*')
        .eq('store_id', storeId)
        .or(`staff_id.eq.${staff.id},staff_id.is.null`)
        .order('created_at', { ascending: false })

      if (notifData) setNotifications(notifData)

      // 今月の確定シフトを取得
      const year = new Date().getFullYear()
      const month = new Date().getMonth()
      const { data: shiftsData } = await supabase
        .from('shifts')
        .select('*')
        .eq('store_id', storeId)
        .eq('staff_id', staff.id)
        .gte('date', `${year}-${String(month + 1).padStart(2, '0')}-01`)
        .lte('date', `${year}-${String(month + 1).padStart(2, '0')}-${new Date(year, month + 1, 0).getDate()}`)

      if (shiftsData) {
        let total = 0
        shiftsData.forEach((s: any) => {
          const start = s.start_time?.slice(0, 5).split(':').map(Number)
          const end = s.end_time?.slice(0, 5).split(':').map(Number)
          if (start && end) {
            total += (end[0] * 60 + end[1] - start[0] * 60 - start[1]) / 60
          }
        })
        setPlannedHours(Math.round(total * 10) / 10)
      }
    }

    const { data: store } = await supabase
      .from('stores')
      .select('name, sub_name')
      .eq('id', storeId)
      .single()

    if (store) setStoreName(store.sub_name ? `${store.name} ${store.sub_name}` : store.name)
  }

  const handleMarkAsRead = async (notifId: string) => {
    const supabase = createClient()
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notifId)

    setNotifications(notifications.map(n => n.id === notifId ? { ...n, is_read: true } : n))
  }

  const unreadCount = notifications.filter(n => !n.is_read).length
  const displayedNotifications = notifications.slice(0, 2)

  return (
    <div className={`min-h-screen ${bgColor}`}>
      <div className="bg-white shadow-sm px-4 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">{storeName || '読み込み中...'}</h1>
          <p className="text-gray-400 text-sm">{staffName}さん</p>
        </div>
        <button onClick={() => router.push('/store-select')} className="text-sm text-gray-400">
          店舗切替
        </button>
      </div>

      <div className="p-4 max-w-sm mx-auto">
        <div className="bg-white rounded-2xl shadow p-4 mb-4">
          <h2 className="text-sm font-medium text-gray-500 mb-3">今月の勤務時間</h2>
          <div className="flex gap-4">
            <div className="flex-1 text-center">
              <p className="text-2xl font-bold text-blue-600">0h</p>
              <p className="text-xs text-gray-400">出勤済み</p>
            </div>
            <div className="flex-1 text-center">
              <p className="text-2xl font-bold text-blue-600">{plannedHours}h</p>
              <p className="text-xs text-gray-400">予定</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <button onClick={() => router.push(`/staff/shifts?store=${storeId}`)} className="bg-white rounded-2xl shadow p-4 text-left">
            <div className="text-2xl mb-2">📅</div>
            <p className="font-semibold text-sm">今月のシフト</p>
          </button>
          <button onClick={() => router.push(`/staff/request?store=${storeId}`)} className="bg-white rounded-2xl shadow p-4 text-left">
            <div className="text-2xl mb-2">✏️</div>
            <p className="font-semibold text-sm">シフト希望提出</p>
          </button>
          <button onClick={() => router.push(`/staff/exchange?store=${storeId}`)} className="bg-white rounded-2xl shadow p-4 text-left relative">
            <div className="text-2xl mb-2">🔄</div>
            <p className="font-semibold text-sm">シフト交換</p>
          </button>
          <button onClick={() => router.push(`/staff/manual?store=${storeId}`)} className="bg-white rounded-2xl shadow p-4 text-left">
            <div className="text-2xl mb-2">📚</div>
            <p className="font-semibold text-sm">店舗マニュアル</p>
          </button>
        </div>

        <button onClick={() => router.push(`/staff/settings?store=${storeId}`)} className="w-full bg-white rounded-2xl shadow p-4 text-left mb-4">
          <div className="flex items-center gap-3">
            <div className="text-2xl">⚙️</div>
            <p className="font-semibold text-sm">設定</p>
          </div>
        </button>

        {/* お知らせ */}
        <div className="bg-white rounded-2xl shadow p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-medium text-gray-500">📢 お知らせ</h2>
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {unreadCount}
                </span>
              )}
            </div>
          </div>
          {notifications.length === 0 ? (
            <div className="text-center text-gray-400 text-sm py-4">
              お知らせはありません
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-2">
                {displayedNotifications.map((n: any) => (
                  <div
                    key={n.id}
                    onClick={() => handleMarkAsRead(n.id)}
                    className={`rounded-xl p-3 cursor-pointer ${n.is_read ? 'bg-gray-50' : 'bg-blue-50 border border-blue-200'}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-400">
                        {new Date(n.created_at).toLocaleDateString('ja-JP')}
                      </span>
                      {!n.is_read && <span className="text-xs text-blue-600 font-semibold">NEW</span>}
                    </div>
                    <p className="text-sm text-gray-700">{n.message}</p>
                  </div>
                ))}
              </div>
              <button
                onClick={() => router.push(`/staff/notifications?store=${storeId}`)}
                className="w-full mt-3 text-xs text-blue-500 text-center py-2"
              >
                {notifications.length > 2
                  ? `▼ もっと見る（${notifications.length - 2}件）`
                  : '▼ お知らせ一覧を見る'
                }
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function StaffHome() {
  return (
    <Suspense>
      <HomeContent />
    </Suspense>
  )
}