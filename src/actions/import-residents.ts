'use server'
import { isElevated } from '@/lib/permissions'


import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface ImportRow {
  full_name: string
  nric: string | null
  date_of_birth: string | null
  gender: 'male' | 'female' | null
  condition: 'mobile' | 'wheelchair_bound' | 'bedridden' | null
  address: string | null
  admission_date: string
  physio: 'yes' | 'no' | 'foc' | 'alternate_day' | null
  physio_remark: string | null
  pay_day: number | null
  fee: number | null
  package_remark: string | null
  include_misc: boolean
  date_of_discharge: string | null
  status: 'active' | 'discharged'
  health_condition: string | null
  health_remark: string | null
  caregiver_nickname: string | null  // resolved to caregiver_id in the action
}

export interface ImportResult {
  success: number
  failed: number
  errors: { row: number; name: string; error: string }[]
}

async function assertAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!isElevated(profile?.role)) throw new Error('Unauthorized: admin only')
  return supabase
}

export async function bulkImportResidents(rows: ImportRow[]): Promise<ImportResult> {
  const supabase = await assertAdmin()

  const result: ImportResult = { success: 0, failed: 0, errors: [] }

  // Resolve caregiver nicknames → worker IDs
  const nicknames = Array.from(
    new Set(rows.map(r => r.caregiver_nickname).filter((n): n is string => !!n))
  )
  const nicknameMap = new Map<string, string>()  // lowercase nickname → worker.id
  if (nicknames.length > 0) {
    const { data: workers } = await supabase
      .from('workers')
      .select('id, nickname')
      .in('nickname', nicknames)
    ;(workers ?? []).forEach(w => {
      if (w.nickname) nicknameMap.set(w.nickname.toLowerCase(), w.id)
    })
  }

  // Transform rows: strip caregiver_nickname, inject caregiver_id
  const dbRows = rows.map(({ caregiver_nickname, ...rest }) => ({
    ...rest,
    caregiver_id: caregiver_nickname
      ? (nicknameMap.get(caregiver_nickname.toLowerCase()) ?? null)
      : null,
  }))

  // Insert in chunks of 20 to avoid timeouts
  const CHUNK = 20
  for (let i = 0; i < dbRows.length; i += CHUNK) {
    const chunk = dbRows.slice(i, i + CHUNK)
    const { data, error } = await supabase
      .from('residents')
      .insert(chunk)
      .select('id')

    if (error) {
      // If bulk fails, try one by one to identify bad rows
      for (let j = 0; j < chunk.length; j++) {
        const row = chunk[j]
        const { error: rowError } = await supabase
          .from('residents')
          .insert(row)
          .select('id')
          .single()

        if (rowError) {
          result.failed++
          const isNricDuplicate =
            rowError.message.includes('residents_nric_unique') ||
            (rowError.message.includes('unique') && rowError.message.includes('nric'))
          result.errors.push({
            row: i + j + 2,
            name: row.full_name,
            error: isNricDuplicate
              ? `Duplicate NRIC: ${row.nric} already exists`
              : rowError.message,
          })
        } else {
          result.success++
        }
      }
    } else {
      result.success += data?.length ?? chunk.length
    }
  }

  if (result.success > 0) {
    revalidatePath('/residents')
  }

  return result
}
