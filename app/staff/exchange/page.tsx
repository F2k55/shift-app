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

function ExchangeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const storeId = searchParams.get('store')

  const [myShifts, setMyShifts] = useState<any[]>([])
  const [exchanges, setExchanges] = useState<any[]>([])
  const [staffId, setStaffId] = useState('')
  const [staff, setStaff] = useState<any[]>([])
  const [selectedShift, setSelectedShift] = useState<any>(null)
  const [tab, setTab] = useState<'request' | 'list'>('list')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [bgColor, setBgColor] = useState('bg-blue-50')

  useEffect(() => {
    setBgColor(getThemeBg())
    if (storeId) fetchData(storeId)
  }, [storeId])

  const fetchData = async (id: string) => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: staffData } = await supabase
      .from('staff')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!staffData) return
    setStaffId(staffData.id)

    const { data: myShiftsData } = await supabase
      .from('shifts')
      .select('*')
      .eq('store_id', id)
      .eq('staff_id', staffData.id)
      .gte('date', new Date().toISOString().slice(0, 10))
      .order('date')

    if (myShiftsData) setMyShifts(myShiftsData)

    const { data: exchangesData } = await supabase
      .from('shift_exchanges')
      .select('*')
      .eq('store_id', id)
      .order('created_at', { ascending: false })

    if (exchangesData) setExchanges(exchangesData)

    const { data: staffStores } = await supabase
      .from('staff_stores')
      .select('staff_id')
      .eq('store_id', id)

    if (staffStores && staffStores.length > 0) {
      const staffIds = staffStores.map((s: any) => s.staff_id)
      const { data: staffData2 } = await supabase
        .from('staff')
        .select('*')
        .in('id', staffIds)
      if (staffData2) setStaff(staffData2)
    }
  }

  const handleRequestExchange = async () => {
    if (!selectedShift) return
    setLoading(true)
    const supabase = createClient()

    await supabase
      .from('shift_exchanges')
      .insert({
        store_id: storeId,
        requester_id: staffId,
        shift_id: selectedShift.id,
        date: selectedShift.date,
        start_time: selectedShift.start_time,
        end_time: selectedShift.end_time,
        status: 'open',
      })

    await supabase
      .from('notifications')
      .insert({
        store_id: storeId,
        staff_id: null,
        type: 'from_owner',
        message: `${new Date(selectedShift.date + 'T00:00:00').toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })}のシフト交換希望が届いています。`,
        is_read: false,
      })

    setLoading(false)
    setSent(true)
    setSelectedShift(null)
    setTimeout(() => setSent(false), 2000)
    fetchData(storeId!)
  }

  const handleAcceptExchange = async (exchange: any) => {
    const supabase = createClient()

    await supabase
      .from('shift_exchanges')
      .update({ status: 'accepted', accepter_id: staffId })
      .eq('id', exchange.id)

    await supabase
      .from('shifts')
      .update({ staff_id: staffId })
      .eq('id', exchange.shift_id)

    fetchData(storeId!)
  }

  const getStaffName = (staffId: string) => {
    return staff.find(s => s.id === staffId)?.name || '不明'
  }

  const myExchangeRequests = exchanges.filter(e => e.requester_id === staffId)
  const otherExchangeRequests = exchanges.filter(e => e.requester_id !== staffId && e.status === 'open')

  return (
    <div className={`min-h-screen ${bgColor}`}>
      <div className="bg-white shadow-sm px-4 py-4 flex items-center gap-3">
        <button onClick={() => router.push(`/staff/home?store=${storeId}`)} className="text-gray-400">←</button>
        <h1 className="text-xl font-bold">🔄 シフト交換</h1>
      </div>

      <div className="p-4 max-w-sm mx-auto">

        {/* タブ */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setTab('list')}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold ${tab === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-500'}`}
          >
            交換一覧
          </button>
          <button
            onClick={() => setTab('request')}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold ${tab === 'request' ? 'bg-blue-600 text-white' : 'bg-white text-gray-500'}`}
          >
            交換申請
          </button>
        </div>

        {tab === 'request' ? (
          <div className="flex flex-col gap-4">
            <div className="bg-white rounded-2xl shadow p-4">
              <h2 className="text-sm font-medium text-gray-500 mb-3">交換したいシフトを選択</h2>
              {myShifts.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">今後のシフトがありません</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {myShifts.map((shift: any) => (
                    <button
                      key={shift.id}
                      onClick={() => setSelectedShift(shift)}
                      className={`flex items-center justify-between px-4 py-3 rounded-xl border ${
                        selectedShift?.id === shift.id
                          ? 'border-blue-400 bg-blue-50'
                          : 'border-gray-200'
                      }`}
                    >
                      <div className="text-left">
                        <p className="text-sm font-semibold">
                          {new Date(shift.date + 'T00:00:00').toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', weekday: 'short' })}
                        </p>
                        <p className="text-xs text-gray-400">
                          {shift.start_time?.slice(0, 5)} 〜 {shift.end_time?.slice(0, 5)}
                        </p>
                      </div>
                      {selectedShift?.id === shift.id && <span className="text-blue-600">✅</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={handleRequestExchange}
              disabled={!selectedShift || loading}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold disabled:opacity-50"
            >
              {sent ? '✅ 申請しました！' : loading ? '申請中...' : '交換申請を出す'}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">

            {/* 他のスタッフの交換申請 */}
            <div className="bg-white rounded-2xl shadow p-4">
              <h2 className="text-sm font-medium text-gray-500 mb-3">交換希望一覧</h2>
              {otherExchangeRequests.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">交換希望はありません</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {otherExchangeRequests.map((exchange: any) => (
                    <div key={exchange.id} className="bg-blue-50 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-semibold">{getStaffName(exchange.requester_id)}</p>
                        <span className="text-xs text-blue-600">交換希望</span>
                      </div>
                      <p className="text-xs text-gray-500 mb-2">
                        {new Date(exchange.date + 'T00:00:00').toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', weekday: 'short' })}
                        　{exchange.start_time?.slice(0, 5)} 〜 {exchange.end_time?.slice(0, 5)}
                      </p>
                      <button
                        onClick={() => handleAcceptExchange(exchange)}
                        className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-semibold"
                      >
                        このシフトに入る
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 自分の申請 */}
            <div className="bg-white rounded-2xl shadow p-4">
              <h2 className="text-sm font-medium text-gray-500 mb-3">自分の申請</h2>
              {myExchangeRequests.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">申請はありません</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {myExchangeRequests.map((exchange: any) => (
                    <div key={exchange.id} className="bg-gray-50 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-semibold">
                          {new Date(exchange.date + 'T00:00:00').toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', weekday: 'short' })}
                        </p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          exchange.status === 'accepted' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'
                        }`}>
                          {exchange.status === 'accepted' ? '✅ 成立' : '⏳ 募集中'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400">
                        {exchange.start_time?.slice(0, 5)} 〜 {exchange.end_time?.slice(0, 5)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  )
}

export default function StaffExchange() {
  return (
    <Suspense>
      <ExchangeContent />
    </Suspense>
  )
}