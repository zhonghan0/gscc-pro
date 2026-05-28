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

function generateTempPassword(): string {
  // Unambiguous characters (no 0/O, 1/l/I)
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export async function createUser(formData: {
  email: string
  full_name: string
  role: Role
}): Promise<{ tempPassword: string }> {
  await assertOwner()

  const schema = z.object({
    email:     z.string().email(),
    full_name: z.string().min(1),
    role:      z.enum(['owner', 'manager', 'care_staff', 'billing']),
  })
  const parsed = schema.parse(formData)

  const tempPassword = generateTempPassword()
  const adminClient = createAdminClient()

  const { error } = await adminClient.auth.admin.createUser({
    email: parsed.email,
    password: tempPassword,
    email_confirm: true,           // skip email verification entirely
    user_metadata: {
      full_name: parsed.full_name,
      role: parsed.role,
    },
  })

  if (error) throw new Error(error.message)

  revalidatePath('/admin/users')
  return { tempPassword }
}

export async function resetUserPassword(staffId: string): Promise<{ tempPassword: string }> {
  await assertOwner()

  const tempPassword = generateTempPassword()
  const adminClient = createAdminClient()

  const { error } = await adminClient.auth.admin.updateUserById(staffId, {
    password: tempPassword,
  })
  if (error) throw new Error(error.message)

  // Also clear activated_at so user is forced to change password on next login
  await createClient().from('profiles').update({ activated_at: null }).eq('id', staffId)

  revalidatePath('/admin/users')
  return { tempPassword }
}

export async function updateStaffRole(staffId: string, role: Role) {
  await assertOwner()

  const supabase = createClient()
  await supabase.from('profiles').update({ role }).eq('id', staffId)
  revalidatePath('/admin/users')
}

export async function deleteStaff(staffId: string) {
  await assertOwner()
  const adminClient = createAdminClient()
  await adminClient.auth.admin.deleteUser(staffId)
  revalidatePath('/admin/users')
}
