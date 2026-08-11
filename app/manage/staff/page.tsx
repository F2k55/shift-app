'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase'

export default function ManageStaff() {
  const router = useRouter()
  const [storeId, setStoreId] = useState('')
  const [staff, setStaff] = useState<any[]>([])
  const [roles, setRoles] = useState<any[]>([])
  const [selectedStaff, setSelectedStaff] = useState<any>(null)
  const [staffRoles, setStaffRoles] = useState<{roleId: string, skillLevel: string}[]>([])

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
  }

  const handleSelectStaff = async (staffMember: any) => {
    setSelectedStaff(staffMember)
    const supabase = createClient()

    const { data } = await supabase
      .from('staff_store_roles')
      .select('role_id, skill_level')
      .eq('staff_id', staffMember.id)
      .eq('store_id', storeId)

    if (data) setStaffRoles(data.map((r: any) => ({ roleId: r.role_id, skillLevel: r.skill_level || '中級' })))
  }

  const handleToggleRole = async (roleId: string) => {
    const supabase = createClient()
    const existing = staffRoles.find(r => r.roleId === roleId)

    if (existing) {
      await supabase
        .from('staff_store_roles')
        .delete()
        .eq('staff_id', selectedStaff.id)
        .eq('store_id', storeId)
        .eq('role_id', roleId)
      setStaffRoles(staffRoles.filter(r => r.roleId !== roleId))
    } else {
      await supabase
        .from('staff_store_roles')
        .insert({
          staff_id: selectedStaff.id,
          store_id: storeId,
          role_id: roleId,
          skill_level: '中級',
        })
      setStaffRoles([...staffRoles, { roleId, skillLevel: '中級' }])
    }
  }

  const handleSkillLevelChange = async (roleId: string, skillLevel: string) => {
    const supabase = createClient()
    await supabase
      .from('staff_store_roles')
      .update({ skill_level: skillLevel })
      .eq('staff_id', selectedStaff.id)
      .eq('store_id', storeId)
      .eq('role_id', roleId)

    setStaffRoles(staffRoles.map(r => r.roleId === roleId ? { ...r, skillLevel } : r))
  }

  const handleRemoveStaff = async (staffId: string) => {
    const supabase = createClient()
    await supabase
      .from('staff_stores')
      .delete()
      .eq('staff_id', staffId)
      .eq('store_id', storeId)
    setSelectedStaff(null)
    fetchData()
  }

  return (
    <div className="min-h-screen bg-blue-50">
      <div className="bg-white shadow-sm px-8 py-5 flex items-center gap-4">
        <button onClick={() => router.push('/manage/dashboard')} className="text-gray-400 text-xl">←</button>
        <h1 className="text-2xl font-bold">👥 スタッフ一覧</h1>
      </div>

      <div className="p-8 w-full">
        <div className="grid grid-cols-2 gap-8">

          {/* 左：スタッフ一覧 */}
          <div className="bg-white rounded-2xl shadow p-6">
            <h2 className="font-medium text-gray-500 mb-4">スタッフ一覧（{staff.length}人）</h2>
            {staff.length === 0 && (
              <p className="text-gray-400 text-center py-8">まだスタッフがいません</p>
            )}
            <div className="flex flex-col gap-3">
              {staff.map((s: any) => (
                <button
                  key={s.id}
                  onClick={() => handleSelectStaff(s)}
                  className={`flex items-center justify-between px-5 py-4 rounded-xl text-left ${
                    selectedStaff?.id === s.id
                      ? 'bg-blue-100 border border-blue-300'
                      : 'bg-gray-50 hover:bg-blue-50'
                  }`}
                >
                  <p className="font-semibold">{s.name}</p>
                  <span className="text-gray-300">→</span>
                </button>
              ))}
            </div>
          </div>

          {/* 右：スタッフ詳細 */}
          <div className="bg-white rounded-2xl shadow p-6">
            {selectedStaff ? (
              <>
                <h2 className="font-medium text-gray-500 mb-2">スタッフ詳細</h2>
                <p className="text-2xl font-bold mb-4">{selectedStaff.name}</p>

                <h3 className="font-medium text-gray-500 mb-3">役割・スキルレベル</h3>
                <div className="flex flex-col gap-3 mb-8">
                  {roles.length === 0 && (
                    <p className="text-gray-400">役割が設定されていません</p>
                  )}
                  {roles.map((role: any) => {
                    const staffRole = staffRoles.find(r => r.roleId === role.id)
                    const hasRole = !!staffRole

                    return (
                      <div key={role.id} className={`rounded-xl px-4 py-3 ${hasRole ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'}`}>
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => handleToggleRole(role.id)}
                            className="flex items-center gap-3"
                          >
                            <span className={`font-medium ${hasRole ? 'text-blue-700' : 'text-gray-400'}`}>{role.name}</span>
                            <span>{hasRole ? '✅' : ''}</span>
                          </button>
                          {hasRole && (
                            <select
                              value={staffRole.skillLevel}
                              onChange={(e) => handleSkillLevelChange(role.id, e.target.value)}
                              className="border border-blue-200 rounded-lg px-3 py-1"
                            >
                              <option value="初級">初級（新人）</option>
                              <option value="中級">中級</option>
                              <option value="上級">上級</option>
                            </select>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                <button
                  onClick={() => handleRemoveStaff(selectedStaff.id)}
                  className="w-full border border-red-300 text-red-400 py-3 rounded-xl"
                >
                  このスタッフを削除
                </button>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                左のスタッフを選択してください
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}