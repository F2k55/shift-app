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

function NotificationsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const storeId = searchParams.get('store')

  const [notifications, setNotifications] = useState<any[]>([])
  const [staffId, setStaffId] = useState('')
  const [bgColor, setBgColor] = useState('bg-blue-50')

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
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!staff) return
    setStaffId(staff.id)

    const { data: notifData } = await supabase
      .from('notifications')
      .select('*')
      .eq('store_id', storeId)
      .or(`staff_id.eq.${staff.id},staff_id.is.null`)
      .order('created_at', { ascending: false })

    if (notifData) setNotifications(notifData)
  }

  const handleMarkAsRead = async (notifId: string) => {
    const supabase = createClient()
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notifId)

    setNotifications(notifications.map(n => n.id === notifId ? { ...n, is_read: true } : n))
  }

  const handleDelete = async (notifId: string) => {
    const supabase = createClient()
    await supabase
      .from('notifications')
      .delete()
      .eq('id', notifId)

    setNotifications(notifications.filter(n => n.id !== notifId))
  }

  const handleMarkAllAsRead = async () => {
    const supabase = createClient()
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id)
    if (unreadIds.length === 0) return

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .in('id', unreadIds)

    setNotifications(notifications.map(n => ({ ...n, is_read: true })))
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <div className={`min-h-screen ${bgColor}`}>
      <div className="bg-white shadow-sm px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push(`/staff/home?store=${storeId}`)} className="text-gray-400">←</button>
          <h1 className="text-xl font-bold">📢 お知らせ</h1>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            className="text-xs text-blue-500"
          >
            全て既読にする
          </button>
        )}
      </div>

      <div className="p-4 max-w-sm mx-auto">
        {notifications.length === 0 ? (
          <div className="bg-white rounded-2xl shadow p-6 text-center text-gray-400 text-sm">
            お知らせはありません
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {notifications.map((n: any) => (
              <div
                key={n.id}
                className={`bg-white rounded-2xl shadow p-4 ${!n.is_read ? 'border border-blue-200' : ''}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">
                      {new Date(n.created_at).toLocaleDateString('ja-JP')}
                    </span>
                    {!n.is_read && (
                      <span className="text-xs text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded-full">NEW</span>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(n.id)}
                    className="text-xs text-red-400"
                  >
                    削除
                  </button>
                </div>
                <p className="text-sm text-gray-700 mb-2">{n.message}</p>
                {!n.is_read && (
                  <button
                    onClick={() => handleMarkAsRead(n.id)}
                    className="text-xs text-blue-500"
                  >
                    既読にする
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function StaffNotifications() {
  return (
    <Suspense>
      <NotificationsContent />
    </Suspense>
  )
}