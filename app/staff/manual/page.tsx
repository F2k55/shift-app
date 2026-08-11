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

function ManualContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const storeId = searchParams.get('store')

  const [categories, setCategories] = useState<any[]>([])
  const [manuals, setManuals] = useState<any[]>([])
  const [openCategories, setOpenCategories] = useState<string[]>([])
  const [selectedManual, setSelectedManual] = useState<any>(null)
  const [bgColor, setBgColor] = useState('bg-blue-50')

  useEffect(() => {
    setBgColor(getThemeBg())
    if (storeId) fetchData(storeId)
  }, [storeId])

  const fetchData = async (id: string) => {
    const supabase = createClient()

    const { data: categoriesData } = await supabase
      .from('manual_categories')
      .select('*')
      .eq('store_id', id)
      .order('created_at')

    if (categoriesData) setCategories(categoriesData)

    const { data: manualsData } = await supabase
      .from('manuals')
      .select('*')
      .eq('store_id', id)
      .order('created_at')

    if (manualsData) setManuals(manualsData)
  }

  const toggleCategory = (categoryId: string) => {
    if (openCategories.includes(categoryId)) {
      setOpenCategories(openCategories.filter(id => id !== categoryId))
    } else {
      setOpenCategories([...openCategories, categoryId])
    }
  }

  const getManualsForCategory = (categoryId: string) => {
    return manuals.filter(m => m.category_id === categoryId)
  }

  return (
    <div className={`min-h-screen ${bgColor}`}>
      <div className="bg-white shadow-sm px-4 py-4 flex items-center gap-3">
        <button onClick={() => router.push(`/staff/home?store=${storeId}`)} className="text-gray-400">←</button>
        <h1 className="text-xl font-bold">📚 店舗マニュアル</h1>
      </div>

      <div className="p-4 max-w-sm mx-auto">
        {!selectedManual ? (
          <>
            {categories.length === 0 && (
              <div className="bg-white rounded-2xl shadow p-6 text-center text-gray-400 text-sm">
                まだマニュアルがありません
              </div>
            )}

            <div className="flex flex-col gap-2">
              {categories.map((cat: any) => (
                <div key={cat.id} className="bg-white rounded-2xl shadow overflow-hidden">
                  <div
                    className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-blue-50"
                    onClick={() => toggleCategory(cat.id)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-sm">
                        {openCategories.includes(cat.id) ? '▼' : '▶'}
                      </span>
                      <p className="font-semibold text-sm">{cat.name}</p>
                      <span className="text-xs text-gray-400">({getManualsForCategory(cat.id).length}件)</span>
                    </div>
                  </div>

                  {openCategories.includes(cat.id) && (
                    <div className="flex flex-col border-t border-gray-100">
                      {getManualsForCategory(cat.id).length === 0 && (
                        <p className="text-xs text-gray-400 px-4 py-3">まだマニュアルがありません</p>
                      )}
                      {getManualsForCategory(cat.id).map((manual: any) => (
                        <button
                          key={manual.id}
                          onClick={() => setSelectedManual(manual)}
                          className="flex items-center justify-between px-4 py-3 border-t border-gray-50 hover:bg-blue-50 text-left"
                        >
                          <p className="text-sm">{manual.title}</p>
                          <span className="text-gray-300">→</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="bg-white rounded-2xl shadow p-5">
            <button
              onClick={() => setSelectedManual(null)}
              className="text-gray-400 text-sm mb-3 flex items-center gap-1"
            >
              ← 一覧に戻る
            </button>
            <p className="text-lg font-bold mb-4">{selectedManual.title}</p>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedManual.content}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function StaffManual() {
  return (
    <Suspense>
      <ManualContent />
    </Suspense>
  )
}