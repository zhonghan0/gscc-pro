'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { isOwner, type Role } from '@/lib/permissions'

async function assertOwner() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!isOwner(profile?.role)) throw new Error('Unauthorized — only Owner can manage users')
  return supabase
}

export async function inviteStaff(formData: {
  email: string
  full_name: string
  role: Role
}) {
  await assertOwner()

  const schema = z.object({
    email:     z.string().email(),
    full_name: z.string().min(1),
    role:      z.enum(['owner', 'manager', 'care_staff', 'billing']),
  })
  const parsed = schema.parse(formData)

  const adminClient = createAdminClient()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

  const { error } = await adminClient.auth.admin.inviteUserByEmail(parsed.email, {
    data: {
      full_name: parsed.full_name,
      role: parsed.role,
    },
    redirectTo: `${siteUrl}/api/auth/callback?next=/activate`,
  })

  if (error) throw new Error(error.message)

  revalidatePath('/admin/staff')
  redirect('/admin/staff')
}

export async function updateStaffRole(staffId: string, role: Role) {
  await assertOwner()

  const supabase = createClient()
  await supabase.from('profiles').update({ role }).eq('id', staffId)
  revalidatePath('/admin/staff')
}

export async function resendInvite(staffId: string) {
  await assertOwner()

  const adminClient = createAdminClient()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

  const { data: { user }, error: userErr } = await adminClient.auth.admin.getUserById(staffId)
  if (userErr || !user) throw new Error('User not found')

  const { data: profile } = await createClient()
    .from('profiles')
    .select('full_name, role')
    .eq('id', staffId)
    .single()

  // Reset email confirmation so inviteUserByEmail won't reject an already-confirmed user
  await adminClient.auth.admin.updateUserById(staffId, { email_confirm: false })

  const { error } = await adminClient.auth.admin.inviteUserByEmail(user.email!, {
    data: { full_name: profile?.full_name ?? '', role: profile?.role ?? 'care_staff' },
    redirectTo: `${siteUrl}/api/auth/callback?next=/activate`,
  })
  if (error) throw new Error(error.message)
}

export async function deleteStaff(staffId: string) {
  await assertOwner()
  const adminClient = createAdminClient()
  await adminClient.auth.admin.deleteUser(staffId)
  revalidatePath('/admin/staff')
}
