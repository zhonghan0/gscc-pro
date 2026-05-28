import { isElevated } from '@/lib/permissions'
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

async function assertAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!isElevated(profile?.role)) throw new Error('Unauthorized')
  return supabase
}

export async function createPosition(name: string) {
  const supabase = await assertAdmin()
  const trimmed = name.trim()
  if (!trimmed) throw new Error('Position name is required')
  const { error } = await supabase.from('positions').insert({ name: trimmed })
  if (error) throw new Error(error.message)
  revalidatePath('/admin/positions')
}

export async function updatePosition(id: string, name: string) {
  const supabase = await assertAdmin()
  const trimmed = name.trim()
  if (!trimmed) throw new Error('Position name is required')
  const { error } = await supabase.from('positions').update({ name: trimmed }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/positions')
}

export async function deletePosition(id: string) {
  const supabase = await assertAdmin()
  const { error } = await supabase.from('positions').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/positions')
}
