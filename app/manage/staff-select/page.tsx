'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '../../lib/supabase'
import { Suspense } from 'react'

function StaffSelectContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const selected = searchParams.get('selected') || ''

  const [staff, setStaff] = useState<any[]>([])
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>(
    selected ? selected.split(',') : []
  )
  const [search, setSearch] = useState('')

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
  }

  const toggleStaff = (staffId: string) => {
    if (selectedStaffIds.includes(staffId)) {
      setSelectedStaffIds(selectedStaffIds.filter(id => id !== staffId))
    } else {
      setSelectedStaffIds([...selectedStaffIds, staffId])
    }
  }

  const handleDone = () => {
    router.push(`/manage/notifications?selected=${selectedStaffIds.join(',')}`)
  }

  const filteredStaff = staff.filter(s =>
    s.name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-blue-50">
      <div className="bg-white shadow-sm px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/manage/notifications')} className="text-gray-400">←</button>
          <h1 className="text-xl font-bold">👥 スタッフを選択</h1>
        </div>
        <button
          onClick={handleDone}
          disabled={selectedStaffIds.length === 0}
          className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
        >
          ✅ 完了（{selectedStaffIds.length}人）
        </button>
      </div>

      <div className="p-6 max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow p-5">
          <input
            type="text"
            placeholder="🔍 名前で検索"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm mb-4"
          />

          {filteredStaff.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-6">見つかりません</p>
          )}

          <div className="flex flex-col gap-2">
            {filteredStaff.map((s: any) => (
              <button
                key={s.id}
                onClick={() => toggleStaff(s.id)}
                className={`flex items-center gap-4 px-4 py-3 rounded-xl border ${
                  selectedStaffIds.includes(s.id) ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-base font-bold text-blue-600">
                  {s.name?.slice(0, 1)}
                </div>
                <p className="text-sm font-medium">{s.name}</p>
                {selectedStaffIds.includes(s.id) && <span className="ml-auto text-blue-600 text-lg">✅</span>}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function StaffSelect() {
  return (
    <Suspense>
      <StaffSelectContent />
    </Suspense>
  )
}