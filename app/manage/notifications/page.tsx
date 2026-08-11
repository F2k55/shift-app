'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '../../lib/supabase'
import { Suspense } from 'react'

function NotificationsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const selectedParam = searchParams.get('selected') || ''

  const [storeId, setStoreId] = useState('')
  const [staff, setStaff] = useState<any[]>([])
  const [target, setTarget] = useState<'all' | 'individual'>('all')
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>(
    selectedParam ? selectedParam.split(',').filter(Boolean) : []
  )
  const [message, setMessage] = useState('')
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    fetchData()
    if (selectedParam) setTarget('individual')
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
    setStoreId(owner.store_id)

    const { data: staffStores } = await supabase
      .from('staff_stores')
      .select('staff_id')
      .eq('store_id', owner.store_id)

    if (staffStores && staffStores.length > 0) {
      const staffIds = staffStores.map((s: any) => s.staff_id)
      const { data: staffData } = await supabase
        .from('staff')
        .select('*')
        .in('id', staffIds)
      if (staffData) setStaff(staffData)
    }

    const { data: notifData } = await supabase
      .from('notifications')
      .select('*')
      .eq('store_id', owner.store_id)
      .order('created_at', { ascending: false })

    if (notifData) setNotifications(notifData)
  }

  const handleSend = async () => {
    if (!message.trim()) return
    if (target === 'individual' && selectedStaffIds.length === 0) return
    setLoading(true)
    const supabase = createClient()

    if (target === 'all') {
      await supabase.from('notifications').insert({
        store_id: storeId,
        staff_id: null,
        type: 'from_owner',
        message,
        is_read: false,
      })
    } else {
      for (const staffId of selectedStaffIds) {
        await supabase.from('notifications').insert({
          store_id: storeId,
          staff_id: staffId,
          type: 'from_owner',
          message,
          is_read: false,
        })
      }
    }

    setMessage('')
    setSelectedStaffIds([])
    setLoading(false)
    setSent(true)
    setTimeout(() => setSent(false), 2000)
    fetchData()
  }

  const getStaffName = (staffId: string) => {
    return staff.find(s => s.id === staffId)?.name || '不明'
  }

  return (
    <div className="min-h-screen bg-blue-50">
      <div className="bg-white shadow-sm px-6 py-4 flex items-center gap-3">
        <button onClick={() => router.push('/manage/dashboard')} className="text-gray-400">←</button>
        <h1 className="text-xl font-bold">📢 お知らせ送信</h1>
      </div>

      <div className="p-6 max-w-6xl mx-auto">
        <div className="grid grid-cols-2 gap-6">

          {/* 左：送信フォーム */}
          <div className="bg-white rounded-2xl shadow p-5">
            <h2 className="text-sm font-medium text-gray-500 mb-4">新しいお知らせを送信</h2>

            <div className="flex gap-2 mb-4">
              <button
                onClick={() => { setTarget('all'); setSelectedStaffIds([]) }}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold ${target === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}
              >
                全体
              </button>
              <button
                onClick={() => setTarget('individual')}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold ${target === 'individual' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}
              >
                個人・複数
              </button>
            </div>

            {target === 'individual' && (
              <div className="mb-4">
                <p className="text-xs text-gray-400 mb-2">送信先を選択</p>
                <button
                  onClick={() => router.push(`/manage/staff-select?selected=${selectedStaffIds.join(',')}`)}
                  className="w-full flex items-center justify-between px-4 py-3 border border-gray-200 rounded-xl hover:bg-blue-50"
                >
                  <span className="text-sm text-gray-600">
                    {selectedStaffIds.length === 0
                      ? '👥 スタッフを選ぶ'
                      : `👥 ${selectedStaffIds.map(id => getStaffName(id)).join('、')}`
                    }
                  </span>
                  {selectedStaffIds.length > 0 && (
                    <span className="text-xs text-blue-600 font-semibold">{selectedStaffIds.length}人</span>
                  )}
                </button>
              </div>
            )}

            <div className="mb-4">
              <p className="text-xs text-gray-400 mb-2">メッセージ</p>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="メッセージを入力してください"
                rows={5}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
              />
            </div>

            <button
              onClick={handleSend}
              disabled={loading || !message.trim() || (target === 'individual' && selectedStaffIds.length === 0)}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold disabled:opacity-50"
            >
              {sent ? '✅ 送信しました！' : loading ? '送信中...' :
                target === 'individual' && selectedStaffIds.length > 0
                  ? `${selectedStaffIds.length}人に送信する`
                  : '送信する'
              }
            </button>
          </div>

          {/* 右：送信履歴 */}
          <div className="bg-white rounded-2xl shadow p-5">
            <h2 className="text-sm font-medium text-gray-500 mb-4">送信履歴</h2>
            {notifications.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">まだ送信履歴がありません</p>
            ) : (
              <div className="flex flex-col gap-3">
                {notifications.map((n: any) => (
                  <div key={n.id} className="bg-blue-50 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-blue-600">
                        {n.staff_id ? `→ ${getStaffName(n.staff_id)}` : '→ 全員'}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(n.created_at).toLocaleDateString('ja-JP')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{n.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}

export default function ManageNotifications() {
  return (
    <Suspense>
      <NotificationsContent />
    </Suspense>
  )
}