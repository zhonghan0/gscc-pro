'use server'
import { isElevated } from '@/lib/permissions'


import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

const workerSchema = z.object({
  worker_type: z.enum(['local', 'foreign']),
  status: z.enum(['active', 'inactive']).default('active'),
  name: z.string().min(1, 'Name is required'),
  gender: z.enum(['male', 'female']).optional().nullable(),
  date_of_birth: z.string().optional().nullable(),
  contact_number: z.string().optional().nullable(),
  date_start_work: z.string().optional().nullable(),
  date_end_work: z.string().optional().nullable(),
  current_salary: z.number().optional().nullable(),
  remark: z.string().optional().nullable(),
  // Local
  nric: z.string().optional().nullable(),
  position_id: z.string().uuid().optional().nullable(),
  address: z.string().optional().nullable(),
  bank: z.string().optional().nullable(),
  bank_account_number: z.string().optional().nullable(),
  kwsp: z.string().optional().nullable(),
  // Foreign
  country_of_origin: z.string().optional().nullable(),
  passport_number: z.string().optional().nullable(),
  passport_expiry: z.string().optional().nullable(),
  passport_permit_date: z.string().optional().nullable(),
  majikan: z.string().optional().nullable(),
  majikan_email: z.string().email().optional().nullable(),
  typhoid_vaccine_expiry: z.string().optional().nullable(),
  nickname: z.string().optional().nullable(),
})

async function assertAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!isElevated(profile?.role)) throw new Error('Unauthorized: admin only')
  return supabase
}

export async function createWorker(formData: unknown) {
  const supabase = await assertAdmin()
  const parsed = workerSchema.parse(formData)

  const { data: worker, error } = await supabase
    .from('workers')
    .insert(parsed)
    .select('id')
    .single()

  if (error) throw new Error(error.message)

  revalidatePath('/admin/workers')
  redirect(`/admin/workers/${worker.id}`)
}

export async function updateWorker(id: string, formData: unknown) {
  const supabase = await assertAdmin()
  const parsed = workerSchema.parse(formData)

  // Auto-inactivate if date_end_work is set
  if (parsed.date_end_work) parsed.status = 'inactive'

  const { error } = await supabase.from('workers').update(parsed).eq('id', id)
  if (error) throw new Error(error.message)

  revalidatePath(`/admin/workers/${id}`)
  revalidatePath('/admin/workers')
  redirect(`/admin/workers/${id}`)
}

export async function deleteWorker(id: string) {
  const supabase = await assertAdmin()
  await supabase.from('workers').delete().eq('id', id)
  revalidatePath('/admin/workers')
  redirect('/admin/workers')
}
