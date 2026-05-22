import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

function fmt(date: string | null | undefined): string {
  if (!date) return ''
  const [y, m, d] = date.split('-')
  return `${d}/${m}/${y}`
}

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const XLSX = require('xlsx') as typeof import('xlsx')

  const [{ data: workers }, { data: positions }] = await Promise.all([
    supabase
      .from('workers')
      .select('*')
      .eq('worker_type', 'local')
      .order('name'),
    supabase
      .from('positions')
      .select('id, name'),
  ])

  const posMap = new Map((positions ?? []).map(p => [p.id, p.name]))

  const headers = [
    'Name', 'Nickname', 'IC', 'Gender', 'DOB', 'Position', 'Contact No.',
    'Date Start Work', 'Date End Work', 'Address', 'Bank', 'Bank Account', 'Salary', 'KWSP', 'Remark',
  ]

  const rows = (workers ?? []).map(w => [
    w.name ?? '',
    w.nickname ?? '',
    w.nric ?? '',
    w.gender === 'male' ? 'M' : w.gender === 'female' ? 'F' : '',
    fmt(w.date_of_birth),
    w.position_id ? (posMap.get(w.position_id) ?? '') : '',
    w.contact_number ?? '',
    fmt(w.date_start_work),
    fmt(w.date_end_work),
    w.address ?? '',
    w.bank ?? '',
    w.bank_account_number ?? '',
    w.current_salary ?? '',
    w.kwsp ?? '',
    w.remark ?? '',
  ])

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])

  ws['!cols'] = [
    { wch: 22 }, { wch: 14 }, { wch: 16 }, { wch: 8 }, { wch: 12 }, { wch: 16 }, { wch: 14 },
    { wch: 15 }, { wch: 15 }, { wch: 35 }, { wch: 14 }, { wch: 18 }, { wch: 10 }, { wch: 12 }, { wch: 20 },
  ]

  XLSX.utils.book_append_sheet(wb, ws, 'Local Workers')
  const buf: Uint8Array = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  const today = new Date().toISOString().slice(0, 10)
  return new NextResponse(buf as unknown as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="LocalWorkers_Export_${today}.xlsx"`,
    },
  })
}
