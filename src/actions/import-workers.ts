'use server'
import { isElevated } from '@/lib/permissions'


import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export interface WorkerImportRow {
  name: string
  passport_number: string | null
  country_of_origin: string | null
  gender: 'male' | 'female' | null
  date_of_birth: string | null
  contact_number: string | null
  date_start_work: string | null
  date_end_work: string | null
  passport_expiry: string | null
  passport_permit_date: string | null
  majikan: string | null
  majikan_email: string | null
  current_salary: number | null
  typhoid_vaccine_expiry: string | null
  remark: string | null
  nickname: string | null
}

export interface WorkerImportResult {
  success: number
  failed: number
  errors: { row: number; name: string; error: string }[]
}

async function assertAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!isElevated(profile?.role)) throw new Error('Unauthorized: admin only')
  return supabase
}

export async function bulkImportWorkers(rows: WorkerImportRow[]): Promise<WorkerImportResult> {
  const supabase = await assertAdmin()

  let success = 0
  let failed = 0
  const errors: WorkerImportResult['errors'] = []

  // Pre-check: find passport numbers that already exist in the DB
  const passports = rows
    .map(r => r.passport_number)
    .filter((p): p is string => !!p)

  if (passports.length > 0) {
    const { data: existing } = await supabase
      .from('workers')
      .select('passport_number')
      .in('passport_number', passports)

    const existingSet = new Set((existing ?? []).map(w => w.passport_number?.toUpperCase()))

    rows.forEach((r, i) => {
      if (r.passport_number && existingSet.has(r.passport_number.toUpperCase())) {
        failed++
        errors.push({
          row: i + 2,
          name: r.name,
          error: `Passport No. "${r.passport_number}" already exists in the database`,
        })
      }
    })
  }

  // Only insert rows that passed the pre-check
  const failedRows = new Set(errors.map(e => e.row))
  const inserts = rows
    .map((r, i) => ({ row: i + 2, data: { ...r, worker_type: 'foreign' as const, status: 'active' as const } }))
    .filter(({ row }) => !failedRows.has(row))

  const CHUNK = 20
  for (let i = 0; i < inserts.length; i += CHUNK) {
    const chunk = inserts.slice(i, i + CHUNK)
    const { error } = await supabase.from('workers').insert(chunk.map(c => c.data))

    if (!error) {
      success += chunk.length
    } else {
      // Retry row-by-row to find the bad ones
      for (let j = 0; j < chunk.length; j++) {
        const { error: rowError } = await supabase.from('workers').insert(chunk[j].data)
        if (!rowError) {
          success++
        } else {
          failed++
          errors.push({
            row: chunk[j].row,
            name: chunk[j].data.name,
            error: rowError.message,
          })
        }
      }
    }
  }

  revalidatePath('/admin/workers')
  return { success, failed, errors }
}
