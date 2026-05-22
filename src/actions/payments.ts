'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
// CSV-parsed transaction (OCBC e-Statement CSV format)
export interface ParsedTransaction {
  date: string          // YYYY-MM-DD
  payerName: string     // Our Ref column
  amount: number        // Credit Amount
  reference: string     // from Supplementary Details (after "REF: ")
  description: string   // from Ref For Account Owner (after "DESC: ")
  paymentMethod: string // duitnow | giro | cheque | fpx | meps | other
  txnKey: string        // `${date}|${amount}|${payerName}`
}

export interface PaymentInput {
  resident_id: string | null
  payment_date: string
  amount: number
  payment_method: string
  payer_name: string | null
  reference: string | null
  description: string | null
  notes: string | null
  for_month?: string | null
}

export async function createPayment(data: PaymentInput) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: inserted, error } = await supabase.from('payments').insert({
    resident_id: data.resident_id || null,
    payment_date: data.payment_date,
    amount: data.amount,
    payment_method: data.payment_method,
    payer_name: data.payer_name || null,
    reference: data.reference || null,
    description: data.description || null,
    notes: data.notes || null,
    for_month: data.for_month || null,
    source: 'manual',
    created_by: user.id,
  }).select('id').single()

  if (error) throw new Error(error.message)

  revalidatePath('/payments')
  redirect(`/payments?highlight=${inserted.id}`)
}

export async function updatePayment(id: string, data: Partial<PaymentInput>) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase.from('payments').update({
    resident_id: data.resident_id ?? null,
    payment_date: data.payment_date,
    amount: data.amount,
    payment_method: data.payment_method,
    payer_name: data.payer_name ?? null,
    reference: data.reference ?? null,
    description: data.description ?? null,
    notes: data.notes ?? null,
    for_month: data.for_month ?? null,
  }).eq('id', id)

  if (error) throw new Error(error.message)

  revalidatePath('/payments')
  redirect('/payments')
}

export async function deletePayment(id: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Unauthorized')

  const { error } = await supabase.from('payments').delete().eq('id', id)
  if (error) throw new Error(error.message)

  revalidatePath('/payments')
}

export interface BatchPaymentInput {
  resident_id: string | null
  payment_date: string
  amount: number
  payment_method: string
  payer_name: string | null
  reference: string | null
  description: string | null
  txn_key: string
  bank_import_id: string
}

export async function saveBatchPayments(
  payments: BatchPaymentInput[],
  payerMappings: Array<{ payer_key: string; resident_id: string }>
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  if (payments.length > 0) {
    // ── Compute for_month for each payment ──────────────────────────────────
    // For each resident, find the first unpaid trailing month (same logic as the grid + button).
    // Payments with an earlier payment_date get the earlier month (sort first so
    // intra-batch allocations are also correct).
    const sorted = [...payments].sort((a, b) => a.payment_date.localeCompare(b.payment_date))

    const residentIds = Array.from(new Set(sorted.map(p => p.resident_id).filter((id): id is string => !!id)))

    // Fetch existing paid months AND admission dates for all residents in this batch
    const [{ data: existingPmts }, { data: residentRows }] = await Promise.all([
      residentIds.length > 0
        ? supabase
            .from('payments')
            .select('resident_id, for_month, payment_date')
            .in('resident_id', residentIds)
        : Promise.resolve({ data: [] }),
      residentIds.length > 0
        ? supabase
            .from('residents')
            .select('id, admission_date')
            .in('id', residentIds)
        : Promise.resolve({ data: [] }),
    ])

    // Build admission month lookup
    const admissionMonths = new Map<string, string>()
    for (const r of residentRows ?? []) {
      if (r.admission_date) admissionMonths.set(r.id, r.admission_date.slice(0, 7))
    }

    // Build mutable paid-month sets per resident (will be updated as we allocate)
    const paidMonths = new Map<string, Set<string>>()
    for (const p of existingPmts ?? []) {
      if (!p.resident_id) continue
      const m = p.for_month ?? p.payment_date?.slice(0, 7)
      if (!m) continue
      if (!paidMonths.has(p.resident_id)) paidMonths.set(p.resident_id, new Set())
      paidMonths.get(p.resident_id)!.add(m)
    }

    /** Build a list of months from 24 months ago up to (and including) paymentYM */
    const monthsUpTo = (paymentYM: string): string[] => {
      const result: string[] = []
      const [py, pm] = paymentYM.split('-').map(Number)
      const endDate = new Date(py, pm - 1, 1)
      const startDate = new Date(endDate)
      startDate.setMonth(startDate.getMonth() - 24)
      const cur = new Date(startDate)
      while (cur <= endDate) {
        result.push(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`)
        cur.setMonth(cur.getMonth() + 1)
      }
      return result
    }

    /** Find the first unpaid trailing month for a resident, up to payment date's month */
    const resolveForMonth = (residentId: string, paymentDate: string): string => {
      const paid = paidMonths.get(residentId) ?? new Set<string>()
      const paymentYM = paymentDate.slice(0, 7)
      const range = monthsUpTo(paymentYM)

      // Admission month is the earliest possible for_month for this resident
      const admissionMonth = admissionMonths.get(residentId) ?? null

      // Last paid month within our look-back window
      const lastPaid = range.filter(m => paid.has(m)).at(-1) ?? null

      // First unpaid month after lastPaid (trailing edge only), never before admission
      const forMonth = range.find(m => {
        if (admissionMonth && m < admissionMonth) return false
        if (lastPaid && m <= lastPaid) return false
        return !paid.has(m)
      }) ?? paymentYM

      // Mark it as allocated so the next payment for this resident gets the next month
      paid.add(forMonth)
      paidMonths.set(residentId, paid)
      return forMonth
    }

    // Build for_month lookup keyed by txn_key
    const forMonthByTxnKey = new Map<string, string>()
    for (const p of sorted) {
      if (p.resident_id) {
        forMonthByTxnKey.set(p.txn_key, resolveForMonth(p.resident_id, p.payment_date))
      }
    }
    // ────────────────────────────────────────────────────────────────────────

    const rows = payments.map(p => ({
      resident_id: p.resident_id || null,
      payment_date: p.payment_date,
      amount: p.amount,
      payment_method: p.payment_method,
      payer_name: p.payer_name || null,
      reference: p.reference || null,
      description: p.description || null,
      for_month: p.resident_id ? (forMonthByTxnKey.get(p.txn_key) ?? null) : null,
      source: 'bank_import' as const,
      bank_import_id: p.bank_import_id,
      txn_key: p.txn_key,
      created_by: user.id,
    }))

    const { error } = await supabase
      .from('payments')
      .insert(rows)
      .select()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (error && (error as any).code !== '23505') {
      throw new Error(error.message)
    }
  }

  // Upsert payer mappings
  if (payerMappings.length > 0) {
    const { error: mapError } = await supabase
      .from('payer_mappings')
      .upsert(
        payerMappings.map(m => ({ payer_key: m.payer_key, resident_id: m.resident_id })),
        { onConflict: 'payer_key' }
      )
    if (mapError) {
      console.error('payer_mappings upsert error:', mapError.message)
    }
  }

  revalidatePath('/payments')
}

export async function importPaymentExcel(
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

  // Read WITHOUT cellDates — cellDates:true produces broken Date objects due to timezone issues.
  // Instead, cells stay as raw Excel serial numbers and we use SSF.parse_date_code which is timezone-safe.
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null })

  if (rows.length < 2) return { imported: 0, skipped: 0, errors: ['No data rows found'] }

  /** Parse an Excel cell value (serial number or string) into YYYY-MM-DD. Returns null if not a date. */
  function parseCellDate(cell: unknown): string | null {
    if (cell === null || cell === undefined || cell === '') return null
    if (typeof cell === 'number') {
      const info = XLSX.SSF.parse_date_code(cell)
      if (!info || !info.y) return null
      return `${info.y}-${String(info.m).padStart(2, '0')}-${String(info.d).padStart(2, '0')}`
    }
    if (typeof cell === 'string') {
      // Try ISO or common formats; avoid Date constructor UTC traps
      const iso = cell.match(/^(\d{4})-(\d{2})-(\d{2})/)
      if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`
    }
    return null
  }

  const headerRow = rows[0] as unknown[]

  // Build column → for_month mapping (cols 3+)
  const monthCols: { colIdx: number; forMonth: string }[] = []
  for (let c = 3; c < headerRow.length; c++) {
    const dateStr = parseCellDate(headerRow[c])
    if (!dateStr) continue
    const forMonth = dateStr.slice(0, 7) // YYYY-MM
    monthCols.push({ colIdx: c, forMonth })
  }

  if (monthCols.length === 0) return { imported: 0, skipped: 0, errors: ['Could not parse any month columns from header row'] }

  // Fetch all residents for name matching
  const { data: residents, error: resErr } = await supabase
    .from('residents')
    .select('id, full_name, fee')
  if (resErr) throw new Error(resErr.message)

  const residentMap = new Map<string, { id: string; fee: number | null }>()
  for (const r of residents ?? []) {
    residentMap.set((r.full_name ?? '').trim().toLowerCase(), { id: r.id, fee: r.fee })
  }

  // Fetch existing excel_import payments for dedup
  const { data: existingRaw } = await supabase
    .from('payments')
    .select('resident_id, for_month')
    .eq('source', 'excel_import')

  const existingSet = new Set<string>()
  for (const e of existingRaw ?? []) {
    if (e.resident_id && e.for_month) {
      existingSet.add(`${e.resident_id}::${e.for_month}`)
    }
  }

  function mapMethod(raw: string): string {
    const s = raw.trim().toLowerCase()
    if (s === 'cash' || s === 'personal') return 'cash'
    if (['maybank', 'cimb', 'rhb', 'hong leong', 'public bank'].includes(s)) return 'online_banking'
    return 'other'
  }

  type PaymentInsertRow = {
    resident_id: string
    payment_date: string
    amount: number
    payment_method: string
    for_month: string
    source: string
    created_by: string
  }

  const toInsert: PaymentInsertRow[] = []
  const errors: string[] = []
  let skipped = 0

  const dataRows = rows.slice(1)
  for (const row of dataRows) {
    if (!row || row.every(c => c === null || c === undefined || c === '')) continue

    const rawName = row[1]
    if (!rawName) continue
    const name = String(rawName).trim().toLowerCase()

    const resident = residentMap.get(name)
    if (!resident) {
      errors.push(`Resident not found: "${String(rawName).trim()}"`)
      continue
    }

    const rawMethod = row[2] ? String(row[2]) : 'other'
    const paymentMethod = mapMethod(rawMethod)
    const amount = resident.fee ?? 0

    for (const { colIdx, forMonth } of monthCols) {
      const cell = row[colIdx]
      if (cell === null || cell === undefined || cell === '') continue

      const paymentDate = parseCellDate(cell)
      if (!paymentDate) continue

      const dedupKey = `${resident.id}::${forMonth}`
      if (existingSet.has(dedupKey)) {
        skipped++
        continue
      }

      existingSet.add(dedupKey) // prevent intra-batch dupes
      toInsert.push({
        resident_id: resident.id,
        payment_date: paymentDate,
        amount: amount > 0 ? amount : 0,
        payment_method: paymentMethod,
        for_month: forMonth,
        source: 'excel_import',
        created_by: user.id,
      })
    }
  }

  if (toInsert.length > 0) {
    // amount must be > 0 per DB constraint — filter out zero-fee rows
    const valid = toInsert.filter(r => r.amount > 0)
    const zeroFee = toInsert.length - valid.length
    if (zeroFee > 0) errors.push(`${zeroFee} row(s) skipped: resident fee is 0 or null`)
    skipped += zeroFee

    if (valid.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: insErr } = await supabase.from('payments').insert(valid as any)
      if (insErr) throw new Error(insErr.message)
    }

    revalidatePath('/payments')
    return { imported: valid.length, skipped, errors }
  }

  return { imported: 0, skipped, errors }
}

export interface ParseStatementResult {
  transactions: ParsedTransaction[]
  payerMappings: Record<string, string>
  existingTxnKeys: string[]
  bankImportId: string
}

export async function parseCSVStatement(formData: FormData): Promise<ParseStatementResult> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const file = formData.get('file') as File | null
  if (!file) throw new Error('No file provided')

  const text = await file.text()

  // Parse CSV with xlsx (handles edge cases cleanly)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const XLSX = require('xlsx') as typeof import('xlsx')
  const wb = XLSX.read(text, { type: 'string' })
  const sheet = wb.Sheets[wb.SheetNames[0]]
  const rows: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })

  if (rows.length < 2) throw new Error('No data found in CSV')

  // Map header names → column indices
  const header = rows[0]
  const col = (name: string) => header.indexOf(name)
  const iPostDate    = col('Post Date')
  const iCredit      = col('Credit Amount')
  const iTxnType     = col('Transaction Type Code')
  const iSuppDetails = col('Supplementary Details')
  const iStmtDetails = col('Statement Details Info')
  const iOurRef      = col('Our Ref')
  const iRefOwner    = col('Ref For Account Owner')

  if (iPostDate < 0 || iCredit < 0) throw new Error('Unrecognised CSV format — expected OCBC e-Statement CSV with header')

  const transactions: ParsedTransaction[] = []

  for (const row of rows.slice(1)) {
    // Only import credits; skip service charges (NCHG)
    const credit = parseFloat(row[iCredit]) || 0
    if (credit <= 0) continue
    if (String(row[iTxnType]).trim() === 'NCHG') continue

    // Date: YYYYMMDD → YYYY-MM-DD
    const raw = String(row[iPostDate]).trim()
    const date = `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`

    const payerName  = String(row[iOurRef]).trim()
    const reference  = String(row[iSuppDetails]).replace(/^REF:\s*/i, '').trim()
    const description = String(row[iRefOwner]).replace(/^DESC:\s*/i, '').trim() || reference

    // Detect payment method from Statement Details Info
    const stmtUpper = String(row[iStmtDetails]).toUpperCase()
    let paymentMethod = 'other'
    if (stmtUpper.includes('DUITNOW'))                       paymentMethod = 'duitnow'
    else if (stmtUpper.includes('GIRO') || stmtUpper.includes('IBG')) paymentMethod = 'giro'
    else if (stmtUpper.includes('CHEQUE'))                   paymentMethod = 'cheque'
    else if (stmtUpper.includes('FPX'))                      paymentMethod = 'fpx'
    else if (stmtUpper.includes('MEPS'))                     paymentMethod = 'meps'

    transactions.push({
      date,
      payerName,
      amount: credit,
      reference,
      description,
      paymentMethod,
      txnKey: `${date}|${credit}|${payerName}`,
    })
  }

  // Create bank_import record
  const { data: bankImport, error: biError } = await supabase
    .from('bank_imports')
    .insert({ file_name: file.name, uploaded_by: user.id })
    .select('id')
    .single()
  if (biError || !bankImport) throw new Error(biError?.message ?? 'Failed to create bank import record')

  // Detect duplicates
  const txnKeys = transactions.map(t => t.txnKey)
  const { data: existingPayments } = await supabase
    .from('payments').select('txn_key').in('txn_key', txnKeys)
  const existingTxnKeys = (existingPayments ?? [])
    .map(p => p.txn_key).filter((k): k is string => k !== null)

  // Fetch known payer → resident mappings for auto-match
  const payerKeys = Array.from(new Set(transactions.map(t => t.payerName.toUpperCase())))
  const { data: mappings } = await supabase
    .from('payer_mappings').select('payer_key, resident_id').in('payer_key', payerKeys)
  const payerMappings: Record<string, string> = {}
  for (const m of mappings ?? []) payerMappings[m.payer_key] = m.resident_id

  return { transactions, payerMappings, existingTxnKeys, bankImportId: bankImport.id }
}
