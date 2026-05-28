'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function activateAccount(data: {
  password: string
  fullName: string
}): Promise<{ error?: string }> {
  const supabase = createClient()

  const { data: { user }, error: userErr } = await supabase.auth.getUser()
  if (userErr || !user) return { error: 'Not authenticated. Please log in again.' }

  // Update password server-side (avoids client-side "Auth session missing" issue)
  const { error: pwErr } = await supabase.auth.updateUser({ password: data.password })
  if (pwErr) return { error: pwErr.message }

  // Update profile
  const now = new Date().toISOString()
  if (data.fullName.trim()) {
    await supabase.auth.updateUser({ data: { full_name: data.fullName.trim() } })
    await supabase.from('profiles').update({ full_name: data.fullName.trim(), activated_at: now }).eq('id', user.id)
  } else {
    await supabase.from('profiles').update({ activated_at: now }).eq('id', user.id)
  }

  revalidatePath('/', 'layout')
  return {}
}
