import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const XLSX = require('xlsx') as typeof import('xlsx')

  // Fetch residents and payments in parallel
  const [{ data: residentsRaw }, { data: paymentsRaw }] = await Promise.all([
    supabase
      .from('residents')
      .select('id, full_name, fee')
      .order('full_name'),
    supabase
      .from('payments')
      .select('resident_id, for_month, payment_date, payment_method')
      .order('payment_date', { ascending: true }),
  ])

  const residents = residentsRaw ?? []
  const payments = paymentsRaw ?? []

  // Build month range: last 24 months up to current month
  const monthRange: string[] = []
  const now = new Date()
  for (let i = 23; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    monthRange.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  // Build lookup: residentId → month → payment
  const lookup = new Map<string, Map<string, { payment_date: string; payment_method: string }>>()
  for (const p of payments) {
    if (!p.resident_id) continue
    const month = p.for_month ?? p.payment_date?.slice(0, 7)
    if (!month) continue
    if (!lookup.has(p.resident_id)) lookup.set(p.resident_id, new Map())
    const existing = lookup.get(p.resident_id)!.get(month)
    if (!existing || p.payment_date < existing.payment_date) {
      lookup.get(p.resident_id)!.set(month, {
        payment_date: p.payment_date,
        payment_method: p.payment_method,
      })
    }
  }

  // Most recent payment method per resident (for the Method column)
  const lastMethod = new Map<string, string>()
  for (const p of [...payments].reverse()) {
    if (p.resident_id && !lastMethod.has(p.resident_id)) {
      lastMethod.set(p.resident_id, p.payment_method)
    }
  }

  /** Convert YYYY-MM-DD to Excel serial number (timezone-safe, no JS Date UTC traps) */
  function dateToSerial(dateStr: string): number {
    const [y, m, d] = dateStr.split('-').map(Number)
    // Days from 1900-01-01 to given date, +1 for Lotus 1900 leap year bug, +1 because serial 1 = 1900-01-01
    const epoch = Date.UTC(1899, 11, 30) // 1899-12-30 UTC = Excel epoch
    const target = Date.UTC(y, m - 1, d)
    return Math.round((target - epoch) / 86400000)
  }

  // Build worksheet data
  // Row 0: headers
  const headerRow: (string | number)[] = ['No', 'Name', 'Method']
  for (const month of monthRange) {
    // First day of month as Excel serial number (matches import template format)
    headerRow.push(dateToSerial(`${month}-01`))
  }

  const dataRows: (string | number | null)[][] = []
  residents.forEach((r, idx) => {
    const resMap = lookup.get(r.id)
    const method = lastMethod.get(r.id) ?? ''
    const row: (string | number | null)[] = [idx + 1, r.full_name, method]
    for (const month of monthRange) {
      const payment = resMap?.get(month)
      row.push(payment ? dateToSerial(payment.payment_date) : null)
    }
    dataRows.push(row)
  })

  const wsData = [headerRow, ...dataRows]

  // Create workbook
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet(wsData)

  // Format header date cells and data cells as dates
  const dateFmt = 'D/M/YY'
  const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1')
  for (let C = 3; C <= range.e.c; C++) {
    // Header date cell
    const hCellAddr = XLSX.utils.encode_cell({ r: 0, c: C })
    if (ws[hCellAddr]) {
      ws[hCellAddr].t = 'n'
      ws[hCellAddr].z = dateFmt
    }
    // Data date cells
    for (let R = 1; R <= range.e.r; R++) {
      const dCellAddr = XLSX.utils.encode_cell({ r: R, c: C })
      if (ws[dCellAddr] && ws[dCellAddr].v != null) {
        ws[dCellAddr].t = 'n'
        ws[dCellAddr].z = dateFmt
      }
    }
  }

  // Set column widths
  ws['!cols'] = [
    { wch: 5 },  // No
    { wch: 28 }, // Name
    { wch: 14 }, // Method
    ...monthRange.map(() => ({ wch: 9 })),
  ]

  XLSX.utils.book_append_sheet(wb, ws, 'Payments')

  const buf: Uint8Array = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  const today = new Date().toISOString().slice(0, 10)
  return new NextResponse(buf as unknown as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="Payment_Export_${today}.xlsx"`,
    },
  })
}
