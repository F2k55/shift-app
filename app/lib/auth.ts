import { createClient } from './supabase'

// 店長の新規登録
export async function registerOwner(
  storeName: string,
  subName: string,
  email: string,
  password: string
) {
  const supabase = createClient()

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  })

  if (authError) return { error: authError.message }

  const storeCode = Math.random().toString(36).substring(2, 8).toUpperCase()

  const { data: storeData, error: storeError } = await supabase
    .from('stores')
    .insert({
      name: storeName,
      sub_name: subName,
      store_code: storeCode,
    })
    .select()
    .single()

  if (storeError) return { error: storeError.message }

  const { error: ownerError } = await supabase
    .from('owners')
    .insert({
      store_id: storeData.id,
      email,
      user_id: authData.user?.id,
    })

  if (ownerError) return { error: ownerError.message }

  return { storeCode }
}

// 店長のログイン
export async function loginOwner(email: string, password: string) {
  const supabase = createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) return { error: error.message }

  const { data: owner } = await supabase
    .from('owners')
    .select('id')
    .eq('user_id', data.user.id)
    .maybeSingle()

  if (!owner) {
    await supabase.auth.signOut()
    return { error: '店長アカウントが見つかりません' }
  }

  return { success: true }
}

// スタッフの新規登録
export async function registerStaff(
  name: string,
  email: string,
  password: string
) {
  const supabase = createClient()

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  })

  if (authError) return { error: authError.message }

  const { error: staffError } = await supabase
    .from('staff')
    .insert({
      name,
      email,
      user_id: authData.user?.id,
    })

  if (staffError) return { error: staffError.message }

  return { success: true }
}

// スタッフのログイン
export async function loginStaff(email: string, password: string) {
  const supabase = createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) return { error: error.message }

  const { data: staff } = await supabase
    .from('staff')
    .select('id')
    .eq('user_id', data.user.id)
    .maybeSingle()

  if (!staff) {
    await supabase.auth.signOut()
    return { error: 'スタッフアカウントが見つかりません' }
  }

  return { success: true }
}

// ログアウト
export async function logout() {
  const supabase = createClient()
  await supabase.auth.signOut()
}