import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

function fmt(date: string | null | undefined): string {
  if (!date) return ''
  const [y, m, d] = date.split('-')
  return `${d}/${m}/${y}`
}

const METHOD_LABELS: Record<string, string> = {
  duitnow: 'DuitNow',
  giro: 'Giro/IBG',
  cash: 'Cash',
  cheque: 'Cheque',
  fpx: 'FPX',
  meps: 'Instant Transfer (MEPS)',
  online_banking: 'Online Banking',
  other: 'Other',
}

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const XLSX = require('xlsx') as typeof import('xlsx')

  const { data: payments, error } = await supabase
    .from('payments')
    .select('*, residents(full_name)')
    .order('payment_date', { ascending: false })

  if (error) throw new Error(error.message)

  const headers = [
    'Resident', 'For Month', 'Payment Date', 'Amount (RM)',
    'Method', 'Payer Name', 'Reference', 'Description', 'Notes', 'Source',
  ]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (payments ?? []).map((p: any) => [
    p.residents?.full_name ?? '',
    p.for_month ?? '',           // YYYY-MM kept as text
    fmt(p.payment_date),
    p.amount ?? 0,
    METHOD_LABELS[p.payment_method] ?? p.payment_method ?? '',
    p.payer_name ?? '',
    p.reference ?? '',
    p.description ?? '',
    p.notes ?? '',
    p.source === 'bank_import' ? 'Bank Import' : p.source === 'excel_import' ? 'Excel Import' : 'Manual',
  ])

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])

  ws['!cols'] = [
    { wch: 24 }, { wch: 10 }, { wch: 14 }, { wch: 12 },
    { wch: 20 }, { wch: 22 }, { wch: 20 }, { wch: 24 }, { wch: 28 }, { wch: 12 },
  ]

  XLSX.utils.book_append_sheet(wb, ws, 'Payments')
  const buf: Uint8Array = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  const today = new Date().toISOString().slice(0, 10)
  return new NextResponse(buf as unknown as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="Payments_Detail_Export_${today}.xlsx"`,
    },
  })
}
