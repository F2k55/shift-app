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
  const [notifSent, setNotifSent] = useState(false)
  const [reviewMode, setReviewMode] = useState(false)
  const [draftShifts, setDraftShifts] = useState<any[]>([])
  const [editingShift, setEditingShift] = useState<any>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [reviewView, setReviewView] = useState<'calendar' | 'timeline'>('calendar')
  const [openTime, setOpenTime] = useState('09:00')
  const [closeTime, setCloseTime] = useState('22:00')

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: owner } = await supabase.from('owners').select('store_id').eq('user_id', user.id).single()
    if (!owner) return
    setStoreId(owner.store_id)

    const { data: store } = await supabase.from('stores').select('open_time, close_time').eq('id', owner.store_id).single()
    if (store) {
      if (store.open_time) setOpenTime(store.open_time.slice(0, 5))
      if (store.close_time) setCloseTime(store.close_time.slice(0, 5))
    }

    const { data: staffStores } = await supabase.from('staff_stores').select('staff_id').eq('store_id', owner.store_id)
    if (staffStores && staffStores.length > 0) {
      const staffIds = staffStores.map((s: any) => s.staff_id)
      const { data: staffData } = await supabase.from('staff').select('*').in('id', staffIds)
      if (staffData) setStaff(staffData)
    }

    const { data: rolesData } = await supabase.from('roles').select('*').eq('store_id', owner.store_id).order('order')
    if (rolesData) setRoles(rolesData)

    const { data: staffRolesData } = await supabase.from('staff_store_roles').select('*').eq('store_id', owner.store_id)
    if (staffRolesData) setStaffRoles(staffRolesData)

    const { data: requestsData } = await supabase.from('shift_requests').select('*').eq('store_id', owner.store_id).order('date')
    if (requestsData) setRequests(requestsData)

    const { data: shiftsData } = await supabase.from('shifts').select('*').eq('store_id', owner.store_id).order('date')
    if (shiftsData) setShifts(shiftsData)
  }

  const handleAutoAssign = async () => {
    setAutoLoading(true)
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const staffWorkCount: { [id: string]: number } = {}
    staff.forEach(s => { staffWorkCount[s.id] = 0 })
    const newDrafts: any[] = []

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const dayReqs = requests.filter(r => r.date === dateStr)
      if (dayReqs.length === 0) continue
      const sorted = [...dayReqs.filter(r => r.priority === 'want'), ...dayReqs.filter(r => r.priority === 'possible')]
      sorted.sort((a, b) => (staffWorkCount[a.staff_id] || 0) - (staffWorkCount[b.staff_id] || 0))
      const assignedSkills: string[] = []
      for (const req of sorted) {
        const sr = staffRoles.find(r => r.staff_id === req.staff_id && r.role_id === req.role_id)
        const skill = sr?.skill_level || '中級'
        if (skill === '初級' && assignedSkills.includes('初級')) continue
        newDrafts.push({ id: `draft_${Date.now()}_${Math.random()}`, store_id: storeId, staff_id: req.staff_id, role_id: req.role_id, date: dateStr, start_time: req.start_time, end_time: req.end_time, status: 'draft' })
        assignedSkills.push(skill)
        staffWorkCount[req.staff_id] = (staffWorkCount[req.staff_id] || 0) + 1
      }
    }
    setDraftShifts(newDrafts)
    setAutoLoading(false)
    setReviewMode(true)
    setReviewView('calendar')
  }

  const handleConfirmShifts = async () => {
    const supabase = createClient()
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    await supabase.from('shifts').delete().eq('store_id', storeId)
      .gte('date', `${year}-${String(month + 1).padStart(2, '0')}-01`)
      .lte('date', `${year}-${String(month + 1).padStart(2, '0')}-${daysInMonth}`)
    const toInsert = draftShifts.map(s => ({ store_id: s.store_id, staff_id: s.staff_id, role_id: s.role_id, date: s.date, start_time: s.start_time, end_time: s.end_time, status: 'confirmed' }))
    if (toInsert.length > 0) await supabase.from('shifts').insert(toInsert)
    await supabase.from('notifications').insert({ store_id: storeId, staff_id: null, type: 'from_owner', message: `${year}年${month + 1}月のシフトが確定しました。アプリでご確認ください。`, is_read: false })
    setReviewMode(false)
    setDraftShifts([])
    setConfirmed(true)
    setTimeout(() => setConfirmed(false), 3000)
    fetchData()
  }

  const handleDeleteDraft = (id: string) => setDraftShifts(draftShifts.filter(s => s.id !== id))

  const handleAddDraft = () => {
    setEditingShift({ id: `draft_${Date.now()}`, store_id: storeId, staff_id: staff[0]?.id || '', role_id: roles[0]?.id || '', date: selectedDate || new Date().toISOString().slice(0, 10), start_time: openTime + ':00', end_time: closeTime + ':00', status: 'draft' })
  }

  const handleSaveEdit = () => {
    if (!editingShift) return
    const exists = draftShifts.find(s => s.id === editingShift.id)
    if (exists) {
      setDraftShifts(draftShifts.map(s => s.id === editingShift.id ? editingShift : s))
    } else {
      setDraftShifts([...draftShifts, editingShift])
    }
    setEditingShift(null)
  }

  const handleRequestStaff = async () => {
    const supabase = createClient()
    await supabase.from('notifications').insert({ store_id: storeId, staff_id: null, type: 'from_owner', message: `${new Date(selectedDate + 'T00:00:00').toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })}の人員が不足しています。入れる方はご連絡ください。`, is_read: false })
    setNotifSent(true)
    setTimeout(() => setNotifSent(false), 3000)
  }

  const timeToMin = (t: string) => { const [h, m] = t.slice(0, 5).split(':').map(Number); return h * 60 + m }
  const openMin = timeToMin(openTime)
  const closeMin = timeToMin(closeTime)
  const totalMin = closeMin - openMin

  const timeLabels = () => {
    const labels = []
    const startH = Math.floor(openMin / 60)
    const endH = Math.ceil(closeMin / 60)
    for (let h = startH; h <= endH; h++) labels.push(`${String(h).padStart(2, '0')}:00`)
    return labels
  }

  const getBarStyle = (startTime: string, endTime: string) => {
    const start = Math.max(timeToMin(startTime), openMin)
    const end = Math.min(timeToMin(endTime), closeMin)
    const left = ((start - openMin) / totalMin) * 100
    const width = ((end - start) / totalMin) * 100
    return { left: `${left}%`, width: `${Math.max(width, 1)}%` }
  }

  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    return { firstDay: new Date(year, month, 1).getDay(), daysInMonth: new Date(year, month + 1, 0).getDate(), year, month }
  }

  const formatDate = (year: number, month: number, day: number) => `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  const getRequestsForDate = (d: string) => requests.filter(r => r.date === d)
  const getShiftsForDate = (d: string) => shifts.filter(s => s.date === d)
  const getDraftsForDate = (d: string) => draftShifts.filter(s => s.date === d)
  const getPriorityLabel = (p: string) => p === 'want' ? '🙋 希望' : '🙂 可能'
  const getStaffName = (id: string) => staff.find(s => s.id === id)?.name || '不明'
  const getRoleName = (id: string) => roles.find(r => r.id === id)?.name || ''

  const { firstDay, daysInMonth, year, month } = getDaysInMonth()
  const DAYS = ['日', '月', '火', '水', '木', '金', '土']
  const WEEKDAY_JA = ['日', '月', '火', '水', '木', '金', '土']
  const selectedDateRequests = selectedDate ? getRequestsForDate(selectedDate) : []
  const selectedDateShifts = selectedDate ? getShiftsForDate(selectedDate) : []
  const selectedDateDrafts = selectedDate ? getDraftsForDate(selectedDate) : []

  const staffColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']
  const getStaffColor = (id: string) => staffColors[staff.findIndex(s => s.id === id) % staffColors.length]

  const BAR_H = 28
  const BAR_GAP = 4

  // ─── 見直し画面 ───
  if (reviewMode) {
    return (
      <div className="min-h-screen bg-blue-50">
        <div className="bg-white shadow-sm px-4 md:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setReviewMode(false)} className="text-gray-400 text-xl">←</button>
            <h1 className="text-xl font-bold">📋 シフト見直し</h1>
            <span className="text-sm text-gray-400">{year}年{month + 1}月</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
              <button onClick={() => setReviewView('calendar')} className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${reviewView === 'calendar' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}>📅 カレンダー</button>
              <button onClick={() => setReviewView('timeline')} className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${reviewView === 'timeline' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}>📊 タイムバー</button>
            </div>
            <button onClick={handleConfirmShifts} className="bg-green-500 text-white px-4 py-2 rounded-xl font-semibold text-sm">✅ 確定・通知</button>
          </div>
        </div>

        <div className="p-4 md:p-6">

          {/* カレンダービュー */}
          {reviewView === 'calendar' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <button onClick={() => setCurrentMonth(new Date(year, month - 1, 1))} className="text-gray-600 px-3 py-1 text-xl">←</button>
                  <p className="text-lg font-bold">{year}年{month + 1}月</p>
                  <button onClick={() => setCurrentMonth(new Date(year, month + 1, 1))} className="text-gray-600 px-3 py-1 text-xl">→</button>
                </div>
                <div className="bg-white rounded-2xl shadow p-4">
                  <div className="grid grid-cols-7 mb-2">
                    {DAYS.map((day, i) => <div key={i} className={`text-center font-bold py-1 ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-700'}`}>{day}</div>)}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: firstDay }).map((_, i) => <div key={i} />)}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                      const day = i + 1
                      const dateStr = formatDate(year, month, day)
                      const drafts = getDraftsForDate(dateStr)
                      const isSelected = selectedDate === dateStr
                      const dow = new Date(year, month, day).getDay()
                      return (
                        <button key={day} onClick={() => setSelectedDate(dateStr)}
                          className={`aspect-square rounded-xl flex flex-col items-center justify-center ${isSelected ? 'bg-blue-600 text-white' : 'hover:bg-blue-50'} ${!isSelected && dow === 0 ? 'text-red-500' : ''} ${!isSelected && dow === 6 ? 'text-blue-500' : ''} ${!isSelected && dow !== 0 && dow !== 6 ? 'text-gray-800' : ''}`}
                        >
                          <span className="text-base font-medium">{day}</span>
                          {drafts.length > 0 && <span className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-blue-500'}`}>{drafts.length}</span>}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                {selectedDate ? (
                  <>
                    <div className="bg-white rounded-2xl shadow p-5">
                      <div className="flex items-center justify-between mb-3">
                        <h2 className="font-medium text-gray-500">{new Date(selectedDate + 'T00:00:00').toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })}のシフト</h2>
                        <button onClick={handleAddDraft} className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg">＋ 追加</button>
                      </div>
                      {selectedDateDrafts.length === 0 ? <p className="text-gray-400 text-center py-4">シフトがありません</p> : (
                        <div className="flex flex-col gap-2">
                          {selectedDateDrafts.map(shift => (
                            <div key={shift.id} className="flex items-center justify-between bg-blue-50 rounded-xl px-3 py-2">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-8 rounded-full" style={{ backgroundColor: getStaffColor(shift.staff_id) }} />
                                <div>
                                  <p className="text-sm font-semibold">{getStaffName(shift.staff_id)}</p>
                                  <p className="text-xs text-gray-400">{shift.start_time?.slice(0, 5)} 〜 {shift.end_time?.slice(0, 5)}{getRoleName(shift.role_id) ? ` · ${getRoleName(shift.role_id)}` : ''}</p>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button onClick={() => setEditingShift(shift)} className="text-xs text-blue-500 border border-blue-200 px-2 py-1 rounded-lg">編集</button>
                                <button onClick={() => handleDeleteDraft(shift.id)} className="text-xs text-red-400 border border-red-200 px-2 py-1 rounded-lg">削除</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {editingShift && (
                      <div className="bg-white rounded-2xl shadow p-5">
                        <h2 className="font-medium text-gray-500 mb-4">{draftShifts.find(s => s.id === editingShift.id) ? '編集' : '追加'}</h2>
                        <div className="flex flex-col gap-3">
                          <div>
                            <p className="text-sm text-gray-400 mb-1">スタッフ</p>
                            <select value={editingShift.staff_id} onChange={e => setEditingShift({ ...editingShift, staff_id: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2">
                              {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                          </div>
                          <div>
                            <p className="text-sm text-gray-400 mb-1">役割</p>
                            <select value={editingShift.role_id} onChange={e => setEditingShift({ ...editingShift, role_id: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2">
                              <option value="">なし</option>
                              {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                            </select>
                          </div>
                          <div className="flex gap-3">
                            <div className="flex-1">
                              <p className="text-sm text-gray-400 mb-1">開始</p>
                              <input type="time" value={editingShift.start_time?.slice(0, 5)} onChange={e => setEditingShift({ ...editingShift, start_time: e.target.value + ':00' })} className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm text-gray-400 mb-1">終了</p>
                              <input type="time" value={editingShift.end_time?.slice(0, 5)} onChange={e => setEditingShift({ ...editingShift, end_time: e.target.value + ':00' })} className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                            </div>
                          </div>
                          <div className="flex gap-3">
                            <button onClick={() => setEditingShift(null)} className="flex-1 border border-gray-300 text-gray-500 py-2 rounded-xl">キャンセル</button>
                            <button onClick={handleSaveEdit} className="flex-1 bg-blue-600 text-white py-2 rounded-xl font-semibold">保存</button>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="bg-white rounded-2xl shadow p-5 flex items-center justify-center text-gray-400 min-h-40">カレンダーから日付を選択してください</div>
                )}
              </div>
            </div>
          )}

          {/* タイムバービュー */}
          {reviewView === 'timeline' && (
            <div className="bg-white rounded-2xl shadow overflow-hidden">
              <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100">
                <button onClick={() => setCurrentMonth(new Date(year, month - 1, 1))} className="text-gray-500 px-3 py-1 text-lg">←</button>
                <p className="font-bold">{year}年{month + 1}月　{openTime} 〜 {closeTime}</p>
                <button onClick={() => setCurrentMonth(new Date(year, month + 1, 1))} className="text-gray-500 px-3 py-1 text-lg">→</button>
              </div>

              <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 220px)' }}>
                <div style={{ minWidth: '600px' }}>

                  {/* 時間軸ヘッダー（sticky） */}
                  <div className="flex sticky top-0 bg-white border-b border-gray-200 z-10" style={{ height: '32px' }}>
                    <div className="shrink-0 border-r border-gray-200" style={{ width: '80px' }} />
                    <div className="flex-1 relative">
                      {timeLabels().map((label, i) => {
                        const pos = ((timeToMin(label) - openMin) / totalMin) * 100
                        if (pos < 0 || pos > 100) return null
                        return (
                          <div key={i} className="absolute top-0 bottom-0 flex items-center" style={{ left: `${pos}%` }}>
                            <div className="h-full border-l border-gray-200" />
                            <span className="text-xs text-gray-400 pl-1 whitespace-nowrap">{label}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* 日付ごとの行 */}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1
                    const dateStr = formatDate(year, month, day)
                    const dayDrafts = getDraftsForDate(dateStr)
                    const dow = new Date(year, month, day).getDay()
                    const rowH = Math.max(dayDrafts.length * (BAR_H + BAR_GAP) + BAR_GAP * 2, 40)

                    return (
                      <div key={day} className={`flex border-b border-gray-100 ${dow === 0 ? 'bg-red-50' : dow === 6 ? 'bg-blue-50' : 'bg-white'}`} style={{ height: `${rowH}px` }}>
                        {/* 日付ラベル */}
                        <div className={`shrink-0 flex flex-col items-center justify-center border-r border-gray-200 ${dow === 0 ? 'text-red-500' : dow === 6 ? 'text-blue-500' : 'text-gray-700'}`} style={{ width: '80px' }}>
                          <span className="text-sm font-bold">{month + 1}/{day}</span>
                          <span className="text-xs text-gray-400">（{WEEKDAY_JA[dow]}）</span>
                        </div>

                        {/* タイムバーエリア */}
                        <div className="flex-1 relative">
                          {/* グリッド線 */}
                          {timeLabels().map((label, idx) => {
                            const pos = ((timeToMin(label) - openMin) / totalMin) * 100
                            if (pos < 0 || pos > 100) return null
                            return <div key={idx} className="absolute top-0 bottom-0 border-l border-gray-100" style={{ left: `${pos}%` }} />
                          })}

                          {dayDrafts.length === 0 ? (
                            <div className="absolute inset-0 flex items-center pl-3">
                              <span className="text-xs text-gray-300">ー</span>
                            </div>
                          ) : (
                            dayDrafts.map((shift, idx) => {
                              const barStyle = getBarStyle(shift.start_time, shift.end_time)
                              const color = getStaffColor(shift.staff_id)
                              const top = BAR_GAP + idx * (BAR_H + BAR_GAP)
                              return (
                                <div
                                  key={shift.id}
                                  className="absolute flex items-center px-2 rounded-md cursor-pointer hover:opacity-80 transition-opacity"
                                  style={{ ...barStyle, top: `${top}px`, height: `${BAR_H}px`, backgroundColor: color }}
                                  onClick={() => { setSelectedDate(dateStr); setEditingShift(shift); setReviewView('calendar') }}
                                  title={`${getStaffName(shift.staff_id)}　${shift.start_time?.slice(0, 5)}〜${shift.end_time?.slice(0, 5)}`}
                                >
                                  <span className="text-white text-xs font-semibold truncate">{getStaffName(shift.staff_id)}</span>
                                </div>
                              )
                            })
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* 凡例 */}
              <div className="px-6 py-3 border-t border-gray-100 flex flex-wrap gap-3">
                {staff.map(s => (
                  <div key={s.id} className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: getStaffColor(s.id) }} />
                    <span className="text-xs text-gray-600">{s.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ─── 通常画面 ───
  return (
    <div className="min-h-screen bg-blue-50">
      <div className="bg-white shadow-sm px-4 md:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/manage/dashboard')} className="text-gray-400 text-xl">←</button>
          <h1 className="text-xl md:text-2xl font-bold">📅 シフト管理</h1>
        </div>
        <button onClick={handleAutoAssign} disabled={autoLoading}
          className="bg-blue-600 text-white px-3 md:px-6 py-2 md:py-3 rounded-xl font-semibold disabled:opacity-50 text-sm md:text-base">
          {confirmed ? '✅ 確定しました！' : autoLoading ? '処理中...' : '🤖 自動振り分け'}
        </button>
      </div>

      <div className="p-4 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <button onClick={() => setCurrentMonth(new Date(year, month - 1, 1))} className="text-gray-600 px-3 py-1 text-xl">←</button>
              <p className="text-lg font-bold">{year}年{month + 1}月</p>
              <button onClick={() => setCurrentMonth(new Date(year, month + 1, 1))} className="text-gray-600 px-3 py-1 text-xl">→</button>
            </div>
            <div className="bg-white rounded-2xl shadow p-4">
              <div className="grid grid-cols-7 mb-2">
                {DAYS.map((day, i) => <div key={i} className={`text-center font-bold py-1 ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-700'}`}>{day}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstDay }).map((_, i) => <div key={i} />)}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1
                  const dateStr = formatDate(year, month, day)
                  const dayShifts = getShiftsForDate(dateStr)
                  const dayRequests = getRequestsForDate(dateStr)
                  const isSelected = selectedDate === dateStr
                  const dow = new Date(year, month, day).getDay()
                  return (
                    <button key={day} onClick={() => setSelectedDate(dateStr)}
                      className={`aspect-square rounded-xl flex flex-col items-center justify-center ${isSelected ? 'bg-blue-600 text-white' : 'hover:bg-blue-50'} ${!isSelected && dow === 0 ? 'text-red-500' : ''} ${!isSelected && dow === 6 ? 'text-blue-500' : ''} ${!isSelected && dow !== 0 && dow !== 6 ? 'text-gray-800' : ''}`}
                    >
                      <span className="text-base font-medium">{day}</span>
                      {dayShifts.length > 0 && <span className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-green-600'}`}>{dayShifts.length}</span>}
                      {dayShifts.length === 0 && dayRequests.length > 0 && <span className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-blue-600'}`}>{dayRequests.length}</span>}
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

          <div className="flex flex-col gap-4">
            {selectedDate ? (
              <>
                <div className="bg-white rounded-2xl shadow p-5">
                  <h2 className="font-medium text-gray-500 mb-3">{new Date(selectedDate + 'T00:00:00').toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })}の確定シフト</h2>
                  {selectedDateShifts.length === 0 ? <p className="text-gray-400 text-center py-4">まだ確定シフトがありません</p> : (
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
                  <button onClick={handleRequestStaff} className="w-full mt-3 border border-orange-300 text-orange-500 py-2 rounded-xl font-semibold">
                    {notifSent ? '✅ 送信しました！' : '⚠️ 人員不足を通知する'}
                  </button>
                </div>
                <div className="bg-white rounded-2xl shadow p-5">
                  <h2 className="font-medium text-gray-500 mb-3">シフト希望</h2>
                  {selectedDateRequests.length === 0 ? <p className="text-gray-400 text-center py-4">希望がありません</p> : (
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
              <div className="bg-white rounded-2xl shadow p-5 flex items-center justify-center text-gray-400 h-40">カレンダーから日付を選択してください</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}