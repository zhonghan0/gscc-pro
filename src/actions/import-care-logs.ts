'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

/** Parse "DD/MM/YYYY HH:MM" or "DD/MM/YYYY" into an ISO datetime string */
function parseDateTimeCell(val: unknown): string | null {
  if (!val) return null
  const s = String(val).trim()

  // DD/MM/YYYY HH:MM
  const full = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})$/)
  if (full) {
    const [, d, m, y, hh, mm] = full
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T${hh.padStart(2, '0')}:${mm}:00`
  }

  // DD/MM/YYYY (default to 08:00)
  const date = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (date) {
    const [, d, m, y] = date
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T08:00:00`
  }

  // YYYY-MM-DD or ISO already
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s

  return null
}

export async function importCareLogs(
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
    resident_id: string
    note_date: string
    note_text: string
    author_id: string
  }

  const toInsert: InsertRow[] = []
  const dataRows = rows.slice(1).filter((r: unknown[]) => r.some(c => c !== ''))

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i]
    const rowNum = i + 2

    const residentName = String(row[0] ?? '').trim()
    const noteDate     = parseDateTimeCell(row[1])
    // col 2 = Author (ignored on import — current user becomes author)
    const noteText     = String(row[3] ?? '').trim()

    if (!residentName) { errors.push(`Row ${rowNum}: Missing resident name`); continue }
    if (!noteDate)     { errors.push(`Row ${rowNum}: Invalid date — use DD/MM/YYYY HH:MM`); continue }
    if (!noteText)     { skipped++; continue } // blank note → skip silently

    const residentId = residentMap.get(residentName.toLowerCase())
    if (!residentId) {
      errors.push(`Row ${rowNum}: Resident not found: "${residentName}"`)
      continue
    }

    toInsert.push({ resident_id: residentId, note_date: noteDate, note_text: noteText, author_id: user.id })
  }

  if (toInsert.length === 0) return { imported: 0, skipped, errors }

  const { error: insErr, data: inserted } = await supabase
    .from('care_notes')
    .insert(toInsert)
    .select('id')

  if (insErr) throw new Error(insErr.message)

  revalidatePath('/care-notes')
  return { imported: inserted?.length ?? toInsert.length, skipped, errors }
}
