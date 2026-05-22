'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

function parseMethod(raw: string): string {
  const s = raw.trim().toLowerCase()
  if (s.includes('duitnow')) return 'duitnow'
  if (s.includes('giro') || s.includes('ibg')) return 'giro'
  if (s === 'cash') return 'cash'
  if (s.includes('cheque')) return 'cheque'
  if (s === 'fpx') return 'fpx'
  if (s.includes('meps') || s.includes('instant')) return 'meps'
  if (s.includes('online') || s.includes('banking')) return 'online_banking'
  return 'other'
}

function parseDateCell(val: unknown): string | null {
  if (!val) return null
  const s = String(val).trim()
  // DD/MM/YYYY
  const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`
  // YYYY-MM-DD
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (iso) return s
  return null
}

export async function importPaymentsDetail(
  formData: FormData
): Promise<{ imported: number; skipped: number; errors: string[] }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const file = formData.get('file') as File | null
  if (!file) throw new Error('No file provided')

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const XLSX = require('xlsx') as typeof import('xlsx')
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: false })
  const sheet = wb.Sheets[wb.SheetNames[0]]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })

  if (rows.length < 2) return { imported: 0, skipped: 0, errors: ['No data rows found'] }

  // Fetch all residents for name matching
  const { data: residents } = await supabase.from('residents').select('id, full_name')
  const residentMap = new Map<string, string>()
  for (const r of residents ?? []) {
    residentMap.set((r.full_name ?? '').trim().toLowerCase(), r.id)
  }

  const errors: string[] = []
  let skipped = 0

  type InsertRow = {
    resident_id: string | null
    for_month: string
    payment_date: string
    amount: number
    payment_method: string
    payer_name: string | null
    reference: string | null
    description: string | null
    notes: string | null
    source: string
    created_by: string
  }

  const toInsert: InsertRow[] = []

  const dataRows = rows.slice(1).filter((r: unknown[]) => r.some(c => c !== ''))

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i]
    const rowNum = i + 2 // 1-indexed, accounting for header

    const residentName = String(row[0] ?? '').trim()
    const forMonth = String(row[1] ?? '').trim()
    const paymentDate = parseDateCell(row[2])
    const amount = parseFloat(String(row[3] ?? '')) || 0
    const method = parseMethod(String(row[4] ?? ''))
    const payerName = String(row[5] ?? '').trim() || null
    const reference = String(row[6] ?? '').trim() || null
    const description = String(row[7] ?? '').trim() || null
    const notes = String(row[8] ?? '').trim() || null

    if (!residentName) { errors.push(`Row ${rowNum}: Missing resident name`); continue }
    if (!forMonth || !/^\d{4}-\d{2}$/.test(forMonth)) { errors.push(`Row ${rowNum}: Invalid For Month "${forMonth}" — use YYYY-MM`); continue }
    if (!paymentDate) { errors.push(`Row ${rowNum}: Invalid payment date — use DD/MM/YYYY`); continue }
    if (amount <= 0) { errors.push(`Row ${rowNum}: Invalid amount`); continue }

    const residentId = residentMap.get(residentName.toLowerCase()) ?? null
    if (!residentId) {
      errors.push(`Row ${rowNum}: Resident not found: "${residentName}"`)
      continue
    }

    toInsert.push({
      resident_id: residentId,
      for_month: forMonth,
      payment_date: paymentDate,
      amount,
      payment_method: method,
      payer_name: payerName,
      reference,
      description,
      notes,
      source: 'excel_import',
      created_by: user.id,
    })
  }

  if (toInsert.length === 0) {
    return { imported: 0, skipped, errors }
  }

  // Insert; ignore duplicate (resident_id + for_month already handled by prior import)
  // We don't dedup here since detailed payments can have multiple payments per month
  const { error: insErr, data: inserted } = await supabase
    .from('payments')
    .insert(toInsert)
    .select('id')

  if (insErr) throw new Error(insErr.message)

  revalidatePath('/payments')
  return { imported: inserted?.length ?? toInsert.length, skipped, errors }
}
