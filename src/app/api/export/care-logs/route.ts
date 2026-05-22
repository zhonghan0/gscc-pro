import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

function fmtDateTime(val: string | null | undefined): string {
  if (!val) return ''
  const d = new Date(val)
  if (isNaN(d.getTime())) return val
  const day   = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year  = d.getFullYear()
  const hh    = String(d.getHours()).padStart(2, '0')
  const mm    = String(d.getMinutes()).padStart(2, '0')
  return `${day}/${month}/${year} ${hh}:${mm}`
}

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const XLSX = require('xlsx') as typeof import('xlsx')

  const { data: notes, error } = await supabase
    .from('care_notes')
    .select('*, residents(full_name), profiles(full_name)')
    .order('note_date', { ascending: false })

  if (error) throw new Error(error.message)

  const headers = ['Resident', 'Date', 'Author', 'Note']

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (notes ?? []).map((n: any) => [
    n.residents?.full_name ?? '',
    fmtDateTime(n.note_date),
    n.profiles?.full_name ?? '',
    n.note_text ?? '',
  ])

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
  ws['!cols'] = [{ wch: 24 }, { wch: 18 }, { wch: 20 }, { wch: 80 }]

  XLSX.utils.book_append_sheet(wb, ws, 'Care Logs')
  const buf: Uint8Array = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  const today = new Date().toISOString().slice(0, 10)
  return new NextResponse(buf as unknown as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="CareLogs_Export_${today}.xlsx"`,
    },
  })
}
