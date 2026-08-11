'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase'

const DAYS = ['日', '月', '火', '水', '木', '金', '土']

export default function Requirements() {
  const router = useRouter()
  const [storeId, setStoreId] = useState('')
  const [openTime, setOpenTime] = useState('09:00')
  const [closeTime, setCloseTime] = useState('22:00')
  const [roles, setRoles] = useState<any[]>([])
  const [selectedRole, setSelectedRole] = useState('')
  const [localValues, setLocalValues] = useState<{ [key: string]: number }>({})
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    if (selectedRole) fetchRequirements()
  }, [selectedRole])

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

    const { data: store } = await supabase
      .from('stores')
      .select('open_time, close_time')
      .eq('id', owner.store_id)
      .single()

    if (store) {
      if (store.open_time) setOpenTime(store.open_time.slice(0, 5))
      if (store.close_time) setCloseTime(store.close_time.slice(0, 5))
    }

    const { data: rolesData } = await supabase
      .from('roles')
      .select('*')
      .eq('store_id', owner.store_id)
      .order('order')

    if (rolesData) {
      setRoles(rolesData)
      if (rolesData.length > 0) setSelectedRole(rolesData[0].id)
    }
  }

  const fetchRequirements = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: owner } = await supabase
      .from('owners')
      .select('store_id')
      .eq('user_id', user.id)
      .single()

    if (!owner) return

    const { data: reqData } = await supabase
      .from('shift_requirements')
      .select('*')
      .eq('store_id', owner.store_id)
      .eq('role_id', selectedRole)

    const newValues: { [key: string]: number } = {}
    if (reqData) {
      reqData.forEach((r: any) => {
        const key = `${r.day_of_week}-${r.time_slot.slice(0, 5)}`
        newValues[key] = r.min_staff
      })
    }
    setLocalValues(newValues)
  }

  const getTimeSlots = () => {
    const slots = []
    const [openH, openM] = openTime.split(':').map(Number)
    const [closeH, closeM] = closeTime.split(':').map(Number)
    let current = openH * 60 + openM
    const end = closeH * 60 + closeM

    while (current < end) {
      const h = Math.floor(current / 60).toString().padStart(2, '0')
      const m = (current % 60).toString().padStart(2, '0')
      slots.push(`${h}:${m}`)
      current += 30
    }
    return slots
  }

  const handleChange = (dayOfWeek: number, timeSlot: string, value: number) => {
    const key = `${dayOfWeek}-${timeSlot}`
    setLocalValues(prev => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    const supabase = createClient()

    for (const [key, value] of Object.entries(localValues)) {
      const [day, time] = key.split('-')
      const dayOfWeek = Number(day)
      const timeSlotFull = time + ':00'

      const { data: existing } = await supabase
        .from('shift_requirements')
        .select('id')
        .eq('store_id', storeId)
        .eq('role_id', selectedRole)
        .eq('day_of_week', dayOfWeek)
        .eq('time_slot', timeSlotFull)
        .single()

      if (existing) {
        await supabase
          .from('shift_requirements')
          .update({ min_staff: value })
          .eq('id', existing.id)
      } else if (value > 0) {
        await supabase
          .from('shift_requirements')
          .insert({
            store_id: storeId,
            role_id: selectedRole,
            day_of_week: dayOfWeek,
            time_slot: timeSlotFull,
            min_staff: value,
          })
      }
    }

    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const timeSlots = getTimeSlots()

  return (
    <div className="min-h-screen bg-blue-50">
      {/* ヘッダー */}
      <div className="bg-white shadow-sm px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/manage/settings')} className="text-gray-400">
            ←
          </button>
          <h1 className="text-xl font-bold">📊 必要人数設定</h1>
        </div>
        <button
          onClick={handleSave}
          className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold"
        >
          {saved ? '✅ 保存済み' : '保存する'}
        </button>
      </div>

      <div className="p-6 max-w-5xl mx-auto">

        {/* 役割タブ */}
        {roles.length > 0 && (
          <div className="flex gap-2 mb-6 flex-wrap">
            {roles.map((role: any) => (
              <button
                key={role.id}
                onClick={() => setSelectedRole(role.id)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold ${selectedRole === role.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-500 shadow'
                  }`}
              >
                {role.name}
              </button>
            ))}
          </div>
        )}

        {roles.length === 0 && (
          <div className="bg-white rounded-2xl shadow p-6 text-center text-gray-400 text-sm mb-6">
            先に設定画面で役割を追加してください
          </div>
        )}

        {/* テーブル */}
        {roles.length > 0 && timeSlots.length > 0 && (
          <div className="bg-white rounded-2xl shadow overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="p-3 text-left text-gray-400 font-medium">時間</th>
                  {DAYS.map((day, i) => (
                    <th key={i} className={`p-3 text-center font-medium ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-700'}`}>
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {timeSlots.map((slot) => (
                  <tr key={slot} className="border-b hover:bg-blue-50">
                    <td className="p-3 text-gray-400 font-medium">{slot}</td>
                    {DAYS.map((_, dayIndex) => (
                      <td key={dayIndex} className="p-2 text-center">
                        <input
                          type="number"
                          min={0}
                          max={99}
                          value={localValues[`${dayIndex}-${slot}`] || 0}
                          onChange={(e) => handleChange(dayIndex, slot, Number(e.target.value))}
                          className="w-12 text-center border border-gray-200 rounded-lg py-1 text-sm"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  )
}