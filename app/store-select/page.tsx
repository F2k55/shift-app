'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../lib/supabase'

export default function StoreSelect() {
  const router = useRouter()
  const [stores, setStores] = useState<any[]>([])
  const [showInput, setShowInput] = useState(false)
  const [storeCode, setStoreCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchStores()
  }, [])

  const fetchStores = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: staffData } = await supabase
      .from('staff')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!staffData) return

    const { data: staffStores } = await supabase
      .from('staff_stores')
      .select('store_id')
      .eq('staff_id', staffData.id)

    if (!staffStores || staffStores.length === 0) return

    const storeIds = staffStores.map((s: any) => s.store_id)

    const { data: storesData } = await supabase
      .from('stores')
      .select('*')
      .in('id', storeIds)

    if (storesData) setStores(storesData)
  }

  const handleAddStore = async () => {
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: staffData } = await supabase
      .from('staff')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!staffData) {
      setError('スタッフ情報が見つかりません')
      setLoading(false)
      return
    }

    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select()
      .eq('store_code', storeCode.toUpperCase())
      .single()

    if (storeError || !store) {
      setError('店舗コードが見つかりません')
      setLoading(false)
      return
    }

    const { error: insertError } = await supabase
      .from('staff_stores')
      .insert({ staff_id: staffData.id, store_id: store.id })

    if (insertError) {
      setError('すでに登録済みの店舗です')
      setLoading(false)
      return
    }

    setStoreCode('')
    setShowInput(false)
    fetchStores()
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-blue-50 p-4">
      <div className="max-w-sm mx-auto">
        <h1 className="text-2xl font-bold mb-1 mt-6">店舗選択</h1>
        <p className="text-gray-400 text-sm mb-6">勤務先を選んでください</p>

        <div className="flex flex-col gap-3 mb-6">
          {stores.length === 0 && (
            <div className="bg-white rounded-2xl shadow p-6 text-center text-gray-400 text-sm">
              まだ店舗が登録されていません
            </div>
          )}
          {stores.map((store: any) => (
            <button
              key={store.id}
              onClick={() => router.push(`/staff/home?store=${store.id}`)}
              className="bg-white rounded-2xl shadow p-4 text-left flex items-center justify-between"
            >
              <div>
                <p className="font-semibold">{store.name}</p>
                {store.sub_name && <p className="text-sm text-gray-400">{store.sub_name}</p>}
              </div>
              <span className="text-gray-300">→</span>
            </button>
          ))}
        </div>

        {showInput ? (
          <div className="bg-white rounded-2xl shadow p-4 flex flex-col gap-3">
            <p className="text-sm font-medium text-gray-700">店舗コードを入力</p>
            <input
              type="text"
              placeholder="例：ABC123"
              value={storeCode}
              onChange={(e) => setStoreCode(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 uppercase"
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => setShowInput(false)}
                className="flex-1 border border-gray-300 text-gray-500 py-2 rounded-xl text-sm"
              >
                キャンセル
              </button>
              <button
                onClick={handleAddStore}
                disabled={loading}
                className="flex-1 bg-green-500 text-white py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
              >
                {loading ? '追加中...' : '追加する'}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowInput(true)}
            className="w-full border-2 border-dashed border-gray-300 rounded-2xl p-4 text-gray-400 text-sm"
          >
            ＋ 新規店舗を追加
          </button>
        )}
      </div>
    </div>
  )
}