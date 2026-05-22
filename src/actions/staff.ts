'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

async function assertAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') throw new Error('Unauthorized')
  return supabase
}

export async function inviteStaff(formData: { email: string; full_name: string; role: 'admin' | 'staff' }) {
  await assertAdmin()

  const schema = z.object({
    email: z.string().email(),
    full_name: z.string().min(1),
    role: z.enum(['admin', 'staff']),
  })
  const parsed = schema.parse(formData)

  const adminClient = createAdminClient()
  const { error } = await adminClient.auth.admin.createUser({
    email: parsed.email,
    email_confirm: true,
    user_metadata: { full_name: parsed.full_name, role: parsed.role },
  })

  if (error) throw new Error(error.message)

  revalidatePath('/admin/staff')
  redirect('/admin/staff')
}

export async function updateStaffRole(staffId: string, role: 'admin' | 'staff') {
  const supabase = await assertAdmin()

  await supabase
    .from('profiles')
    .update({ role })
    .eq('id', staffId)

  revalidatePath('/admin/staff')
}

export async function deleteStaff(staffId: string) {
  await assertAdmin()
  const adminClient = createAdminClient()
  await adminClient.auth.admin.deleteUser(staffId)
  revalidatePath('/admin/staff')
}
