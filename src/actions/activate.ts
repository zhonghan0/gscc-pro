'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function activateAccount(data: {
  password: string
  fullName: string
}): Promise<{ error?: string }> {
  const supabase = createClient()

  const { data: { user }, error: userErr } = await supabase.auth.getUser()
  if (userErr || !user) return { error: 'Not authenticated. Please log in again.' }

  // Update password via admin client to guarantee it goes through
  const adminClient = createAdminClient()
  const { error: pwErr } = await adminClient.auth.admin.updateUserById(user.id, {
    password: data.password,
  })
  if (pwErr) return { error: pwErr.message }

  // Update profile — use admin client to bypass any RLS issues
  const now = new Date().toISOString()
  const profileUpdate = data.fullName.trim()
    ? { full_name: data.fullName.trim(), activated_at: now }
    : { activated_at: now }

  const { error: profileErr } = await adminClient
    .from('profiles')
    .update(profileUpdate)
    .eq('id', user.id)

  if (profileErr) return { error: profileErr.message }

  revalidatePath('/', 'layout')
  return {}
}
