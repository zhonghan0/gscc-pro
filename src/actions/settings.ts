'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function updateSetting(key: string, value: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Unauthorized')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('app_settings')
    .update({ value, updated_at: new Date().toISOString() })
    .eq('key', key)
  if (error) throw new Error(error.message)

  revalidatePath('/admin/master-data')
  revalidatePath('/', 'layout') // bust cached settings across the app
}
