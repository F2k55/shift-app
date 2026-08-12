'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase'

export default function ManageShifts() {
  const router = useRouter()
  const [storeId, setStoreId] = useState('')
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [requests, setRequests] = useState<any[]>([])
  const [shifts, setShifts] = useState<any[]>([])
  const [staff, setStaff] = useState<any[]>([])
  const [roles, setRoles] = useState<any[]>([])
  const [staffRoles, setStaffRoles] = useState<any[]>([])
  const [selectedDate, setSelectedDate] = useState('')
  const [autoLoading, setAutoLoading] = useState(false)
  const [autoSaved, setAutoSaved] = useState(false)
  const [notifSent, setNotifSent] = useState(false)

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

    const { data: rolesData } = await supabase
      .from('roles')
      .select('*')
      .eq('store_id', owner.store_id)
      .order('order')

    if (rolesData) setRoles(rolesData)

    const { data: staffRolesData } = await supabase
      .from('staff_store_roles')
      .select('*')
      .eq('store_id', owner.store_id)

    if (staffRolesData) setStaffRoles(staffRolesData)

    const { data: requestsData } = await supabase
      .from('shift_requests')
      .select('*')
      .eq('store_id', owner.store_id)
      .order('date')

    if (requestsData) setRequests(requestsData)

    const { data: shiftsData } = await supabase
      .from('shifts')
      .select('*')
      .eq('store_id', owner.store_id)
      .order('date')

    if (shiftsData) setShifts(shiftsData)
  }

  const handleAutoAssign = async () => {
    setAutoLoading(true)
    const supabase = createClient()

    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    await supabase
      .from('shifts')
      .delete()
      .eq('store_id', storeId)
      .gte('date', `${year}-${String(month + 1).padStart(2, '0')}-01`)
      .lte('date', `${year}-${String(month + 1).padStart(2, '0')}-${daysInMonth}`)

    const staffWorkCount: { [staffId: string]: number } = {}
    staff.forEach(s => { staffWorkCount[s.id] = 0 })

    const newShifts: any[] = []

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const dayRequests = requests.filter(r => r.date === dateStr)

      if (dayRequests.length === 0) continue

      const wantRequests = dayRequests.filter(r => r.priority === 'want')
      const possibleRequests = dayRequests.filter(r => r.priority === 'possible')
      const sortedRequests = [...wantRequests, ...possibleRequests]

      const assignedSkillLevels: string[] = []
      sortedRequests.sort((a, b) => (staffWorkCount[a.staff_id] || 0) - (staffWorkCount[b.staff_id] || 0))

      for (const req of sortedRequests) {
        const staffRole = staffRoles.find(r => r.staff_id === req.staff_id && r.role_id === req.role_id)
        const skillLevel = staffRole?.skill_level || '中級'

        if (skillLevel === '初級' && assignedSkillLevels.includes('初級')) continue

        newShifts.push({
          store_id: storeId,
          staff_id: req.staff_id,
          role_id: req.role_id,
          date: dateStr,
          start_time: req.start_time,
          end_time: req.end_time,
          status: 'confirmed',
        })

        assignedSkillLevels.push(skillLevel)
        staffWorkCount[req.staff_id] = (staffWorkCount[req.staff_id] || 0) + 1
      }
    }

    if (newShifts.length > 0) {
      await supabase.from('shifts').insert(newShifts)
    }

    setAutoLoading(false)
    setAutoSaved(true)
    setTimeout(() => setAutoSaved(false), 3000)
    fetchData()
  }

  const handleRequestStaff = async () => {
    const supabase = createClient()
    await supabase.from('notifications').insert({
      store_id: storeId,
      staff_id: null,
      type: 'from_owner',
      message: `${new Date(selectedDate + 'T00:00:00').toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })}の人員が不足しています。入れる方はご連絡ください。`,
      is_read: false,
    })
    setNotifSent(true)
    setTimeout(() => setNotifSent(false), 3000)
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

  const getRequestsForDate = (dateStr: string) => requests.filter(r => r.date === dateStr)
  const getShiftsForDate = (dateStr: string) => shifts.filter(s => s.date === dateStr)
  const getPriorityLabel = (priority: string) => priority === 'want' ? '🙋 希望' : '🙂 可能'
  const getStaffName = (staffId: string) => staff.find(s => s.id === staffId)?.name || '不明'
  const getRoleName = (roleId: string) => roles.find(r => r.id === roleId)?.name || ''

  const { firstDay, daysInMonth, year, month } = getDaysInMonth()
  const DAYS = ['日', '月', '火', '水', '木', '金', '土']
  const selectedDateRequests = selectedDate ? getRequestsForDate(selectedDate) : []
  const selectedDateShifts = selectedDate ? getShiftsForDate(selectedDate) : []

  return (
    <div className="min-h-screen bg-blue-50">
      <div className="bg-white shadow-sm px-4 md:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/manage/dashboard')} className="text-gray-400 text-xl">←</button>
          <h1 className="text-xl md:text-2xl font-bold">📅 シフト管理</h1>
        </div>
        <button
          onClick={handleAutoAssign}
          disabled={autoLoading}
          className="bg-blue-600 text-white px-3 md:px-6 py-2 md:py-3 rounded-xl font-semibold disabled:opacity-50 text-sm md:text-base"
        >
          {autoSaved ? '✅ 完了！' : autoLoading ? '処理中...' : '🤖 自動振り分け'}
        </button>
      </div>

      <div className="p-4 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">

          {/* カレンダー */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <button onClick={() => setCurrentMonth(new Date(year, month - 1, 1))} className="text-gray-600 px-3 py-1 text-xl">←</button>
              <p className="text-lg font-bold">{year}年{month + 1}月</p>
              <button onClick={() => setCurrentMonth(new Date(year, month + 1, 1))} className="text-gray-600 px-3 py-1 text-xl">→</button>
            </div>

            <div className="bg-white rounded-2xl shadow p-4">
              <div className="grid grid-cols-7 mb-2">
                {DAYS.map((day, i) => (
                  <div key={i} className={`text-center font-bold py-1 ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-700'}`}>
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstDay }).map((_, i) => <div key={i} />)}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1
                  const dateStr = formatDate(year, month, day)
                  const dayRequests = getRequestsForDate(dateStr)
                  const dayShifts = getShiftsForDate(dateStr)
                  const isSelected = selectedDate === dateStr
                  const dayOfWeek = new Date(year, month, day).getDay()

                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedDate(dateStr)}
                      className={`aspect-square rounded-xl flex flex-col items-center justify-center
                        ${isSelected ? 'bg-blue-600 text-white' : 'hover:bg-blue-50'}
                        ${!isSelected && dayOfWeek === 0 ? 'text-red-500' : ''}
                        ${!isSelected && dayOfWeek === 6 ? 'text-blue-500' : ''}
                        ${!isSelected && dayOfWeek !== 0 && dayOfWeek !== 6 ? 'text-gray-800' : ''}
                      `}
                    >
                      <span className="text-base font-medium">{day}</span>
                      {dayShifts.length > 0 && (
                        <span className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-green-600'}`}>{dayShifts.length}</span>
                      )}
                      {dayShifts.length === 0 && dayRequests.length > 0 && (
                        <span className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-blue-600'}`}>{dayRequests.length}</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="flex gap-4 text-gray-600 font-medium">
              <span>🔵 希望あり</span>
              <span>🟢 確定済み</span>
            </div>
          </div>

          {/* 選択した日の詳細 */}
          <div className="flex flex-col gap-4">
            {selectedDate ? (
              <>
                <div className="bg-white rounded-2xl shadow p-5">
                  <h2 className="font-medium text-gray-500 mb-3">
                    {new Date(selectedDate + 'T00:00:00').toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })}の確定シフト
                  </h2>
                  {selectedDateShifts.length === 0 ? (
                    <p className="text-gray-400 text-center py-4">まだ確定シフトがありません</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {selectedDateShifts.map((shift: any) => (
                        <div key={shift.id} className="bg-green-50 rounded-xl p-3">
                          <div className="flex items-center justify-between">
                            <p className="font-semibold">{getStaffName(shift.staff_id)}</p>
                            <span className="text-green-600 font-semibold">✅ 確定</span>
                          </div>
                          <p className="text-sm text-gray-500 mt-1">{shift.start_time?.slice(0, 5)} 〜 {shift.end_time?.slice(0, 5)}</p>
                          {shift.role_id && <p className="text-sm text-gray-400 mt-1">{getRoleName(shift.role_id)}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={handleRequestStaff}
                    className="w-full mt-3 border border-orange-300 text-orange-500 py-2 rounded-xl font-semibold"
                  >
                    {notifSent ? '✅ 送信しました！' : '⚠️ 人員不足を通知する'}
                  </button>
                </div>

                <div className="bg-white rounded-2xl shadow p-5">
                  <h2 className="font-medium text-gray-500 mb-3">シフト希望</h2>
                  {selectedDateRequests.length === 0 ? (
                    <p className="text-gray-400 text-center py-4">希望がありません</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {selectedDateRequests.map((req: any) => (
                        <div key={req.id} className="bg-blue-50 rounded-xl p-3">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-semibold">{getStaffName(req.staff_id)}</p>
                            <span className="text-blue-600">{getPriorityLabel(req.priority)}</span>
                          </div>
                          <p className="text-sm text-gray-500">{req.start_time?.slice(0, 5)} 〜 {req.end_time?.slice(0, 5)}</p>
                          {req.role_id && <p className="text-sm text-gray-400 mt-1">{getRoleName(req.role_id)}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="bg-white rounded-2xl shadow p-5 flex items-center justify-center text-gray-400 h-40">
                カレンダーから日付を選択してください
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}