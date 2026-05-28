import { isElevated } from '@/lib/permissions'
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

const residentSchema = z.object({
  // Details
  full_name: z.string().min(1, 'Full name is required'),
  nric: z.string().optional().nullable(),
  date_of_birth: z.string().optional().nullable(),
  gender: z.enum(['male', 'female']).optional().nullable(),
  condition: z.enum(['mobile', 'wheelchair_bound', 'bedridden']).optional().nullable(),
  address: z.string().optional().nullable(),
  admission_date: z.string().min(1, 'Admission date is required'),
  date_of_discharge: z.string().optional().nullable(),
  status: z.enum(['active', 'discharged']).default('active'),
  // Package
  physio: z.enum(['yes', 'no', 'foc', 'alternate_day']).optional().nullable().default('no'),
  physio_remark: z.string().optional().nullable(),
  caregiver: z.string().optional().nullable(),
  include_misc: z.boolean().optional().nullable(),
  pay_day: z.number().int().min(1).max(31).optional().nullable().default(1),
  fee: z.number().optional().nullable(),
  account: z.enum(['quickbook', 'cash']).optional().nullable().default(null),
  package_remark: z.string().optional().nullable(),
  // Health
  health_condition: z.string().optional().nullable(),
  health_remark: z.string().optional().nullable(),
  // Caregiver
  caregiver_id: z.string().uuid().optional().nullable(),
})

async function assertAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!isElevated(profile?.role)) {
    throw new Error('Unauthorized: admin only')
  }

  return supabase
}

function friendlyError(msg: string): string {
  if (msg.includes('residents_nric_unique') || msg.includes('unique') && msg.includes('nric')) {
    return 'A resident with this NRIC already exists.'
  }
  return msg
}

export async function createResident(formData: unknown) {
  const supabase = await assertAdmin()
  const parsed = residentSchema.parse(formData)

  // Check NRIC uniqueness before insert
  if (parsed.nric) {
    const { data: existing } = await supabase
      .from('residents')
      .select('id, full_name')
      .eq('nric', parsed.nric)
      .maybeSingle()
    if (existing) {
      throw new Error(`NRIC ${parsed.nric} is already registered to ${(existing as { full_name: string }).full_name}.`)
    }
  }

  const { data: resident, error } = await supabase
    .from('residents')
    .insert(parsed)
    .select('id')
    .single()

  if (error) throw new Error(friendlyError(error.message))

  revalidatePath('/residents')
  redirect(`/residents/${resident.id}`)
}

export async function updateResident(id: string, formData: unknown) {
  const supabase = await assertAdmin()
  const parsed = residentSchema.parse(formData)

  // Check NRIC uniqueness (exclude self)
  if (parsed.nric) {
    const { data: existing } = await supabase
      .from('residents')
      .select('id, full_name')
      .eq('nric', parsed.nric)
      .neq('id', id)
      .maybeSingle()
    if (existing) {
      throw new Error(`NRIC ${parsed.nric} is already registered to ${(existing as { full_name: string }).full_name}.`)
    }
  }

  const { error } = await supabase
    .from('residents')
    .update({ ...parsed, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw new Error(friendlyError(error.message))

  revalidatePath(`/residents/${id}`)
  revalidatePath('/residents')
  redirect(`/residents/${id}`)
}

export async function deleteResident(id: string) {
  const supabase = await assertAdmin()
  await supabase.from('residents').delete().eq('id', id)
  revalidatePath('/residents')
  redirect('/residents')
}

export async function dischargeResident(id: string, dischargeDate: string) {
  const supabase = await assertAdmin()
  const { error } = await supabase
    .from('residents')
    .update({ status: 'discharged', date_of_discharge: dischargeDate })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath(`/residents/${id}`)
  revalidatePath('/residents')
}
