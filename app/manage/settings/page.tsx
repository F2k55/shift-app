'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase'

export default function ManageSettings() {
  const router = useRouter()
  const [storeName, setStoreName] = useState('')
  const [storeCode, setStoreCode] = useState('')
  const [openTime, setOpenTime] = useState('09:00')
  const [closeTime, setCloseTime] = useState('22:00')
  const [maxConsecutiveDays, setMaxConsecutiveDays] = useState(3)
  const [roles, setRoles] = useState<any[]>([])
  const [newRole, setNewRole] = useState('')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [storeId, setStoreId] = useState('')
  const [copied, setCopied] = useState(false)
  const [minHours, setMinHours] = useState(0)
  const [maxHours, setMaxHours] = useState(40)
  const [breakShort, setBreakShort] = useState(45)
  const [breakLong, setBreakLong] = useState(60)
  const [submitDeadline, setSubmitDeadline] = useState(25)
  const [closedDays, setClosedDays] = useState<number[]>([])

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: owner } = await supabase
      .from('owners')
      .select('store_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!owner) return
    setStoreId(owner.store_id)

    const { data: store } = await supabase
      .from('stores')
      .select('*')
      .eq('id', owner.store_id)
      .maybeSingle()

    if (store) {
      setStoreName(store.sub_name ? `${store.name} ${store.sub_name}` : store.name)
      setStoreCode(store.store_code)
      if (store.open_time) setOpenTime(store.open_time.slice(0, 5))
      if (store.close_time) setCloseTime(store.close_time.slice(0, 5))
      if (store.max_consecutive_days) setMaxConsecutiveDays(store.max_consecutive_days)
      if (store.min_hours) setMinHours(store.min_hours)
      if (store.max_hours) setMaxHours(store.max_hours)
      if (store.break_short) setBreakShort(store.break_short)
      if (store.break_long) setBreakLong(store.break_long)
      if (store.submit_deadline) setSubmitDeadline(store.submit_deadline)
      if (store.closed_days) setClosedDays(JSON.parse(store.closed_days))
    }

    const { data: rolesData } = await supabase
      .from('roles')
      .select('*')
      .eq('store_id', owner.store_id)
      .order('order')

    if (rolesData) setRoles(rolesData)
  }

  const handleSave = async () => {
    setLoading(true)
    const supabase = createClient()

    await supabase
      .from('stores')
      .update({
        open_time: openTime,
        close_time: closeTime,
        max_consecutive_days: maxConsecutiveDays,
        min_hours: minHours,
        max_hours: maxHours,
        break_short: breakShort,
        break_long: breakLong,
        submit_deadline: submitDeadline,
        closed_days: JSON.stringify(closedDays),
      })
      .eq('id', storeId)

    setLoading(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleAddRole = async () => {
    if (!newRole.trim()) return
    const supabase = createClient()
    await supabase.from('roles').insert({
      store_id: storeId,
      name: newRole,
      order: roles.length + 1,
    })
    setNewRole('')
    fetchSettings()
  }

  const handleDeleteRole = async (roleId: string) => {
    const supabase = createClient()
    await supabase.from('roles').delete().eq('id', roleId)
    fetchSettings()
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(storeCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-blue-50">
      <div className="bg-white shadow-sm px-8 py-5 flex items-center gap-4">
        <button onClick={() => router.push('/manage/dashboard')} className="text-gray-400 text-xl">←</button>
        <h1 className="text-2xl font-bold">⚙️ 設定</h1>
      </div>

      <div className="p-8 w-full">
        <div className="grid grid-cols-3 gap-8 mb-8">

          {/* 左カラム */}
          <div className="flex flex-col gap-6">
            <div className="bg-white rounded-2xl shadow p-6">
              <h2 className="font-medium text-gray-500 mb-4">店舗情報</h2>
              <p className="text-lg font-semibold text-gray-700 mb-4">{storeName}</p>
              <div className="bg-blue-50 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">店舗コード</p>
                  <p className="text-3xl font-bold text-blue-600 tracking-widest">{storeCode}</p>
                </div>
                <button onClick={handleCopy} className="text-blue-600 border border-blue-300 px-4 py-2 rounded-lg">
                  {copied ? '✅' : '📋 コピー'}
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow p-6">
              <h2 className="font-medium text-gray-500 mb-4">営業時間</h2>
              <div className="flex items-center gap-3">
                <input type="time" value={openTime} onChange={(e) => setOpenTime(e.target.value)} className="border border-gray-300 rounded-lg px-4 py-3 flex-1" />
                <span className="text-gray-400">〜</span>
                <input type="time" value={closeTime} onChange={(e) => setCloseTime(e.target.value)} className="border border-gray-300 rounded-lg px-4 py-3 flex-1" />
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow p-6">
              <h2 className="font-medium text-gray-500 mb-4">最大連続勤務日数</h2>
              <div className="flex items-center gap-3">
                <input type="number" value={maxConsecutiveDays} onChange={(e) => setMaxConsecutiveDays(Number(e.target.value))} min={1} max={7} className="border border-gray-300 rounded-lg px-4 py-3 w-24" />
                <span className="text-gray-400">日</span>
              </div>
            </div>

            <button onClick={() => router.push('/manage/requirements')} className="w-full bg-white border border-blue-300 text-blue-600 py-4 rounded-xl font-semibold shadow">
              📊 必要人数設定
            </button>
          </div>

          {/* 中カラム */}
          <div className="flex flex-col gap-6">
            <div className="bg-white rounded-2xl shadow p-6">
              <h2 className="font-medium text-gray-500 mb-4">勤務時間設定</h2>
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <label className="text-gray-700">最低勤務時間</label>
                  <div className="flex items-center gap-2">
                    <input type="number" value={minHours} onChange={(e) => setMinHours(Number(e.target.value))} min={0} max={300} className="border border-gray-300 rounded-lg px-4 py-3 w-24 text-center" />
                    <span className="text-gray-400">時間/月</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-gray-700">最大勤務時間</label>
                  <div className="flex items-center gap-2">
                    <input type="number" value={maxHours} onChange={(e) => setMaxHours(Number(e.target.value))} min={0} max={300} className="border border-gray-300 rounded-lg px-4 py-3 w-24 text-center" />
                    <span className="text-gray-400">時間/月</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow p-6">
              <h2 className="font-medium text-gray-500 mb-2">休憩自動計算</h2>
              <p className="text-sm text-gray-400 mb-4">労働基準法に基づいた設定です</p>
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <label className="text-gray-700">6h以上8h以下</label>
                  <div className="flex items-center gap-2">
                    <input type="number" value={breakShort} onChange={(e) => setBreakShort(Number(e.target.value))} min={0} max={120} className="border border-gray-300 rounded-lg px-4 py-3 w-24 text-center" />
                    <span className="text-gray-400">分</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-gray-700">8h超</label>
                  <div className="flex items-center gap-2">
                    <input type="number" value={breakLong} onChange={(e) => setBreakLong(Number(e.target.value))} min={0} max={120} className="border border-gray-300 rounded-lg px-4 py-3 w-24 text-center" />
                    <span className="text-gray-400">分</span>
                  </div>
                </div>
                <button onClick={() => { setBreakShort(45); setBreakLong(60) }} className="text-blue-500 text-right text-sm">
                  ↩ 法定通りに戻す（45分・60分）
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow p-6">
              <h2 className="font-medium text-gray-500 mb-4">シフト提出期限</h2>
              <div className="flex items-center gap-3">
                <span className="text-gray-700">毎月</span>
                <input type="number" value={submitDeadline} onChange={(e) => setSubmitDeadline(Number(e.target.value))} min={1} max={31} className="border border-gray-300 rounded-lg px-4 py-3 w-24 text-center" />
                <span className="text-gray-700">日まで</span>
              </div>
            </div>
          </div>

          {/* 右カラム */}
          <div className="flex flex-col gap-6">
            <div className="bg-white rounded-2xl shadow p-6 flex-1">
              <h2 className="font-medium text-gray-500 mb-4">役割管理</h2>
              <div className="flex flex-col gap-3 mb-5">
                {roles.length === 0 && (
                  <p className="text-gray-400 text-center py-4">まだ役割がありません</p>
                )}
                {roles.map((role: any) => (
                  <div key={role.id} className="flex items-center justify-between bg-blue-50 rounded-lg px-4 py-3">
                    <p className="font-medium">{role.name}</p>
                    <button onClick={() => handleDeleteRole(role.id)} className="text-red-400">削除</button>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <input type="text" placeholder="例：キッチン" value={newRole} onChange={(e) => setNewRole(e.target.value)} className="border border-gray-300 rounded-lg px-4 py-3 flex-1" />
                <button onClick={handleAddRole} className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold whitespace-nowrap">追加</button>
              </div>
            </div>
          </div>

        </div>

        {/* 下段：定休日＋保存ボタン */}
        <div className="grid grid-cols-3 gap-8">
          <div className="col-span-2 bg-white rounded-2xl shadow p-6">
            <h2 className="font-medium text-gray-500 mb-4">定休日設定</h2>
            <div className="flex gap-4 justify-center">
              {['日', '月', '火', '水', '木', '金', '土'].map((day, i) => (
                <button
                  key={i}
                  onClick={() => {
                    if (closedDays.includes(i)) {
                      setClosedDays(closedDays.filter(d => d !== i))
                    } else {
                      setClosedDays([...closedDays, i])
                    }
                  }}
                  className={`w-14 h-14 rounded-full font-semibold ${closedDays.includes(i) ? 'bg-red-400 text-white' : 'bg-gray-100 text-gray-600'}`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-stretch">
            <button onClick={handleSave} disabled={loading} className="w-full bg-blue-600 text-white py-4 rounded-xl font-semibold disabled:opacity-50">
              {saved ? '✅ 保存しました！' : loading ? '保存中...' : '設定を保存する'}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}