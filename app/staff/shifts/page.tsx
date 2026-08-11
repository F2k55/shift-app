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

function ShiftsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const storeId = searchParams.get('store')

  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [shifts, setShifts] = useState<any[]>([])
  const [staffId, setStaffId] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
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

    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()

    const { data: shiftsData } = await supabase
      .from('shifts')
      .select('*')
      .eq('store_id', id)
      .eq('staff_id', staffData.id)
      .gte('date', `${year}-${String(month + 1).padStart(2, '0')}-01`)
      .lte('date', `${year}-${String(month + 1).padStart(2, '0')}-${new Date(year, month + 1, 0).getDate()}`)
      .order('date')

    if (shiftsData) setShifts(shiftsData)
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

  const getShiftsForDate = (dateStr: string) => {
    return shifts.filter(s => s.date === dateStr)
  }

  const getTotalHours = () => {
    let total = 0
    shifts.forEach(s => {
      const start = s.start_time?.slice(0, 5).split(':').map(Number)
      const end = s.end_time?.slice(0, 5).split(':').map(Number)
      if (start && end) {
        total += (end[0] * 60 + end[1] - start[0] * 60 - start[1]) / 60
      }
    })
    return Math.round(total * 10) / 10
  }

  const { firstDay, daysInMonth, year, month } = getDaysInMonth()
  const DAYS = ['日', '月', '火', '水', '木', '金', '土']
  const selectedDateShifts = selectedDate ? getShiftsForDate(selectedDate) : []

  return (
    <div className={`min-h-screen ${bgColor}`}>
      <div className="bg-white shadow-sm px-4 py-4 flex items-center gap-3">
        <button onClick={() => router.push(`/staff/home?store=${storeId}`)} className="text-gray-400">←</button>
        <h1 className="text-xl font-bold">📅 今月のシフト</h1>
      </div>

      <div className="p-4 max-w-sm mx-auto">
        <div className="bg-white rounded-2xl shadow p-4 mb-4">
          <div className="flex justify-between">
            <div className="text-center flex-1">
              <p className="text-2xl font-bold text-blue-600">{shifts.length}</p>
              <p className="text-xs text-gray-400">出勤予定</p>
            </div>
            <div className="text-center flex-1">
              <p className="text-2xl font-bold text-blue-600">{getTotalHours()}h</p>
              <p className="text-xs text-gray-400">合計時間</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <button onClick={() => { setCurrentMonth(new Date(year, month - 1, 1)); if (storeId) fetchData(storeId) }} className="text-gray-400 px-3 py-1">←</button>
          <p className="font-bold">{year}年{month + 1}月</p>
          <button onClick={() => { setCurrentMonth(new Date(year, month + 1, 1)); if (storeId) fetchData(storeId) }} className="text-gray-400 px-3 py-1">→</button>
        </div>

        <div className="bg-white rounded-2xl shadow p-4 mb-4">
          <div className="grid grid-cols-7 mb-2">
            {DAYS.map((day, i) => (
              <div key={i} className={`text-center text-xs font-medium py-1 ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-500'}`}>
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDay }).map((_, i) => <div key={i} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const dateStr = formatDate(year, month, day)
              const dayShifts = getShiftsForDate(dateStr)
              const isSelected = selectedDate === dateStr
              const isToday = dateStr === formatDate(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())
              const dayOfWeek = new Date(year, month, day).getDay()
              const hasShift = dayShifts.length > 0

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`aspect-square rounded-full text-sm flex flex-col items-center justify-center
                    ${isSelected ? 'bg-blue-600 text-white' : ''}
                    ${hasShift && !isSelected ? 'bg-blue-100 text-blue-700 font-bold' : ''}
                    ${isToday && !isSelected && !hasShift ? 'border-2 border-blue-400 text-blue-600 font-bold' : ''}
                    ${!isSelected && !hasShift && !isToday && dayOfWeek === 0 ? 'text-red-400' : ''}
                    ${!isSelected && !hasShift && !isToday && dayOfWeek === 6 ? 'text-blue-400' : ''}
                  `}
                >
                  {day}
                </button>
              )
            })}
          </div>
        </div>

        {selectedDate && (
          <div className="bg-white rounded-2xl shadow p-4 mb-4">
            <h2 className="text-sm font-medium text-gray-500 mb-3">
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })}
            </h2>
            {selectedDateShifts.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">この日はお休みです</p>
            ) : (
              <div className="flex flex-col gap-2">
                {selectedDateShifts.map((shift: any) => (
                  <div key={shift.id} className="bg-blue-50 rounded-xl p-3">
                    <p className="font-semibold text-sm text-blue-700">
                      {shift.start_time?.slice(0, 5)} 〜 {shift.end_time?.slice(0, 5)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow p-4">
          <h2 className="text-sm font-medium text-gray-500 mb-3">今月のシフト一覧</h2>
          {shifts.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">まだシフトが確定していません</p>
          ) : (
            <div className="flex flex-col gap-2">
              {shifts.map((shift: any) => (
                <div key={shift.id} className="flex items-center justify-between py-2 border-b border-gray-100">
                  <p className="text-sm font-medium">
                    {new Date(shift.date + 'T00:00:00').toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', weekday: 'short' })}
                  </p>
                  <p className="text-sm text-gray-500">
                    {shift.start_time?.slice(0, 5)} 〜 {shift.end_time?.slice(0, 5)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function StaffShifts() {
  return (
    <Suspense>
      <ShiftsContent />
    </Suspense>
  )
}