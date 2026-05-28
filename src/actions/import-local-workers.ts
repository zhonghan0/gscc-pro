import { isElevated } from '@/lib/permissions'
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export interface LocalWorkerImportRow {
  name: string
  nric: string | null
  gender: 'male' | 'female' | null
  date_of_birth: string | null
  contact_number: string | null
  date_start_work: string | null
  date_end_work: string | null
  current_salary: number | null
  bank: string | null
  bank_account_number: string | null
  kwsp: string | null
  position_name: string | null   // resolved to position_id in the action
  address: string | null
  remark: string | null
  nickname: string | null
}

export interface LocalWorkerImportResult {
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

export async function bulkImportLocalWorkers(rows: LocalWorkerImportRow[]): Promise<LocalWorkerImportResult> {
  const supabase = await assertAdmin()

  let success = 0
  let failed = 0
  const errors: LocalWorkerImportResult['errors'] = []

  // Pre-check: find NRICs that already exist in the DB
  const nrics = rows.map(r => r.nric).filter((n): n is string => !!n)
  const existingNricSet = new Set<string>()
  if (nrics.length > 0) {
    const { data: existing } = await supabase
      .from('workers')
      .select('nric')
      .in('nric', nrics)
    ;(existing ?? []).forEach(w => { if (w.nric) existingNricSet.add(w.nric) })
  }

  // Fetch existing positions for name → id lookup (case-insensitive)
  const { data: positionsData } = await supabase.from('positions').select('id, name')
  const positionMap = new Map<string, string>(
    (positionsData ?? []).map(p => [p.name.toLowerCase(), p.id])
  )

  // Create any positions that don't exist yet (deduplicated by name)
  const newPositionNames = Array.from(
    new Set(
      rows
        .map(r => r.position_name?.trim())
        .filter((n): n is string => !!n && !positionMap.has(n.toLowerCase()))
    )
  )
  for (const posName of newPositionNames) {
    const { data: created } = await supabase
      .from('positions')
      .insert({ name: posName })
      .select('id, name')
      .single()
    if (created) positionMap.set(created.name.toLowerCase(), created.id)
  }

  // Track failed row indices
  const failedRowIndices = new Set<number>()

  rows.forEach((r, i) => {
    if (r.nric && existingNricSet.has(r.nric)) {
      failed++
      failedRowIndices.add(i)
      errors.push({ row: i + 2, name: r.name, error: `NRIC "${r.nric}" already exists in the database` })
    }
  })

  // Build inserts for non-failed rows
  const inserts = rows
    .map((r, i) => {
      if (failedRowIndices.has(i)) return null
      const positionId = r.position_name
        ? (positionMap.get(r.position_name.toLowerCase()) ?? null)
        : null
      return {
        rowIndex: i,
        data: {
          name: r.name,
          nric: r.nric,
          gender: r.gender,
          date_of_birth: r.date_of_birth,
          contact_number: r.contact_number,
          date_start_work: r.date_start_work,
          date_end_work: r.date_end_work,
          current_salary: r.current_salary,
          bank: r.bank,
          bank_account_number: r.bank_account_number,
          kwsp: r.kwsp,
          position_id: positionId,
          address: r.address,
          remark: r.remark,
          nickname: r.nickname,
          worker_type: 'local' as const,
          status: 'active' as const,
        },
      }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)

  const CHUNK = 20
  for (let i = 0; i < inserts.length; i += CHUNK) {
    const chunk = inserts.slice(i, i + CHUNK)
    const { error } = await supabase.from('workers').insert(chunk.map(c => c.data))

    if (!error) {
      success += chunk.length
    } else {
      for (let j = 0; j < chunk.length; j++) {
        const { error: rowError } = await supabase.from('workers').insert(chunk[j].data)
        if (!rowError) {
          success++
        } else {
          failed++
          errors.push({
            row: chunk[j].rowIndex + 2,
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
