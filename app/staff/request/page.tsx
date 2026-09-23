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

function RequestContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const storeId = searchParams.get('store')

  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDates, setSelectedDates] = useState<string[]>([])
  const [openTime, setOpenTime] = useState('09:00')
  const [closeTime, setCloseTime] = useState('22:00')
  const [roles, setRoles] = useState<any[]>([])
  const [step, setStep] = useState<'calendar' | 'detail'>('calendar')
  const [dateSettings, setDateSettings] = useState<{[date: string]: {
    priority: string
    startTime: string
    endTime: string
    roleId: string
  }}>({})
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [bgColor, setBgColor] = useState('bg-blue-50')

  useEffect(() => {
    setBgColor(getThemeBg())
    if (storeId) fetchData(storeId)
  }, [storeId])

  const fetchData = async (id: string) => {
    const supabase = createClient()

    const { data: store } = await supabase
      .from('stores')
      .select('open_time, close_time')
      .eq('id', id)
      .maybeSingle()

    if (store) {
      if (store.open_time) setOpenTime(store.open_time.slice(0, 5))
      if (store.close_time) setCloseTime(store.close_time.slice(0, 5))
    }

    const { data: rolesData } = await supabase
      .from('roles')
      .select('*')
      .eq('store_id', id)
      .order('order')

    if (rolesData) setRoles(rolesData)
  }

  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    return { firstDay, daysInMonth, year, month }
  }

  const formatDate = (year: number, month: number, day: number) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  const toggleDate = (dateStr: string) => {
    if (selectedDates.includes(dateStr)) {
      setSelectedDates(selectedDates.filter(d => d !== dateStr))
    } else {
      setSelectedDates([...selectedDates, dateStr])
    }
  }

  const getTimeSlots = () => {
    const slots = []
    const [openH, openM] = openTime.split(':').map(Number)
    const [closeH, closeM] = closeTime.split(':').map(Number)
    let current = openH * 60 + openM
    const end = closeH * 60 + closeM
    while (current <= end) {
      const h = Math.floor(current / 60).toString().padStart(2, '0')
      const m = (current % 60).toString().padStart(2, '0')
      slots.push(`${h}:${m}`)
      current += 30
    }
    return slots
  }

  const handleNextStep = () => {
    if (selectedDates.length === 0) return
    const initial: typeof dateSettings = {}
    selectedDates.forEach(date => {
      initial[date] = dateSettings[date] || {
        priority: 'want',
        startTime: openTime,
        endTime: closeTime,
        roleId: roles[0]?.id || '',
      }
    })
    setDateSettings(initial)
    setStep('detail')
  }

  const handleSubmit = async () => {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    const { data: staffData } = await supabase
      .from('staff')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!staffData) {
      setLoading(false)
      return
    }

    for (const date of selectedDates) {
      const setting = dateSettings[date]
      await supabase
        .from('shift_requests')
        .insert({
          staff_id: staffData.id,
          store_id: storeId,
          role_id: setting.roleId || null,
          date,
          start_time: setting.startTime + ':00',
          end_time: setting.endTime + ':00',
          priority: setting.priority,
        })
    }

    setLoading(false)
    setSubmitted(true)
    setTimeout(() => {
      router.push(`/staff/home?store=${storeId}`)
    }, 2000)
  }

  const { firstDay, daysInMonth, year, month } = getDaysInMonth()
  const timeSlots = getTimeSlots()
  const DAYS = ['日', '月', '火', '水', '木', '金', '土']
  const PRIORITY_OPTIONS = [
    { value: 'want', label: '🙋 希望' },
    { value: 'possible', label: '🙂 可能' },
  ]

  if (submitted) {
    return (
      <div className={`min-h-screen ${bgColor} flex items-center justify-center`}>
        <div className="bg-white rounded-2xl shadow p-8 text-center">
          <div className="text-5xl mb-4">✅</div>
          <h1 className="text-xl font-bold mb-2">提出完了！</h1>
          <p className="text-gray-400 text-sm">シフト希望を提出しました</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${bgColor}`}>
      <div className="bg-white shadow-sm px-4 py-4 flex items-center gap-3">
        <button
          onClick={() => step === 'detail' ? setStep('calendar') : router.push(`/staff/home?store=${storeId}`)}
          className="text-gray-400"
        >←</button>
        <h1 className="text-xl font-bold">✏️ シフト希望提出</h1>
      </div>

      <div className="p-4 max-w-sm mx-auto">
        {step === 'calendar' ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setCurrentMonth(new Date(year, month - 1, 1))} className="text-gray-400 px-3 py-1">←</button>
              <p className="font-bold">{year}年{month + 1}月</p>
              <button onClick={() => setCurrentMonth(new Date(year, month + 1, 1))} className="text-gray-400 px-3 py-1">→</button>
            </div>

            <div className="bg-white rounded-2xl shadow p-4 mb-4">
              <div className="grid grid-cols-7 mb-2">
                {DAYS.map((day, i) => (
                  <div key={i} className={`text-center text-xs font-medium py-1 ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-500'}`}>{day}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstDay }).map((_, i) => <div key={i} />)}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1
                  const dateStr = formatDate(year, month, day)
                  const isSelected = selectedDates.includes(dateStr)
                  const isToday = dateStr === formatDate(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())
                  const dayOfWeek = new Date(year, month, day).getDay()

                  return (
                    <button
                      key={day}
                      onClick={() => toggleDate(dateStr)}
                      className={`aspect-square rounded-full text-sm flex items-center justify-center
                        ${isSelected ? 'bg-blue-600 text-white font-bold' : ''}
                        ${isToday && !isSelected ? 'border-2 border-blue-400 text-blue-600 font-bold' : ''}
                        ${!isSelected && !isToday && dayOfWeek === 0 ? 'text-red-400' : ''}
                        ${!isSelected && !isToday && dayOfWeek === 6 ? 'text-blue-400' : ''}
                        ${!isSelected && !isToday ? 'hover:bg-blue-50' : ''}
                      `}
                    >
                      {day}
                    </button>
                  )
                })}
              </div>
            </div>

            <p className="text-xs text-gray-400 text-center mb-4">
              {selectedDates.length > 0 ? `${selectedDates.length}日選択中` : '希望日をタップしてください'}
            </p>

            <button
              onClick={handleNextStep}
              disabled={selectedDates.length === 0}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold disabled:opacity-50"
            >
              次へ（時間・優先度を設定）
            </button>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-4">{selectedDates.length}日分の設定をしてください</p>

            <div className="flex flex-col gap-4 mb-6">
              {selectedDates.sort().map(date => (
                <div key={date} className="bg-white rounded-2xl shadow p-4">
                  <p className="font-bold mb-3">{new Date(date + 'T00:00:00').toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })}</p>

                  <p className="text-xs text-gray-400 mb-2">希望度</p>
                  <div className="flex gap-2 mb-3">
                    {PRIORITY_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setDateSettings(prev => ({
                          ...prev,
                          [date]: { ...prev[date], priority: opt.value }
                        }))}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-semibold ${
                          dateSettings[date]?.priority === opt.value
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  <p className="text-xs text-gray-400 mb-2">時間</p>
                  <div className="flex items-center gap-2 mb-3">
                    <select
                      value={dateSettings[date]?.startTime}
                      onChange={(e) => setDateSettings(prev => ({
                        ...prev,
                        [date]: { ...prev[date], startTime: e.target.value }
                      }))}
                      className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm flex-1"
                    >
                      {timeSlots.map(slot => (
                        <option key={slot} value={slot}>{slot}</option>
                      ))}
                    </select>
                    <span className="text-gray-400">〜</span>
                    <select
                      value={dateSettings[date]?.endTime}
                      onChange={(e) => setDateSettings(prev => ({
                        ...prev,
                        [date]: { ...prev[date], endTime: e.target.value }
                      }))}
                      className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm flex-1"
                    >
                      {timeSlots.map(slot => (
                        <option key={slot} value={slot}>{slot}</option>
                      ))}
                    </select>
                  </div>

                  {roles.length > 0 && (
                    <>
                      <p className="text-xs text-gray-400 mb-2">役割</p>
                      <div className="flex gap-2 flex-wrap">
                        {roles.map(role => (
                          <button
                            key={role.id}
                            onClick={() => setDateSettings(prev => ({
                              ...prev,
                              [date]: { ...prev[date], roleId: role.id }
                            }))}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                              dateSettings[date]?.roleId === role.id
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-500'
                            }`}
                          >
                            {role.name}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold disabled:opacity-50"
            >
              {loading ? '提出中...' : '希望シフトを提出する'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default function StaffRequest() {
  return (
    <Suspense>
      <RequestContent />
    </Suspense>
  )
}