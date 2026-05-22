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

  const { data: workers } = await supabase
    .from('workers')
    .select('*')
    .eq('worker_type', 'foreign')
    .order('name')

  const headers = [
    'Name', 'Nickname', 'Passport No.', 'Country of Origin', 'Gender',
    'DOB', 'Contact No.', 'Date Start Work', 'Date End Work',
    'Passport Expiry', 'Permit Expiry Date', 'Majikan', 'Majikan Email',
    'Salary', 'Typhoid Vaccine Expiry', 'Remark',
  ]

  const rows = (workers ?? []).map(w => [
    w.name ?? '',
    w.nickname ?? '',
    w.passport_number ?? '',
    w.country_of_origin ?? '',
    w.gender === 'male' ? 'M' : w.gender === 'female' ? 'F' : '',
    fmt(w.date_of_birth),
    w.contact_number ?? '',
    fmt(w.date_start_work),
    fmt(w.date_end_work),
    fmt(w.passport_expiry),
    fmt(w.passport_permit_date),
    w.majikan ?? '',
    w.majikan_email ?? '',
    w.current_salary ?? '',
    fmt(w.typhoid_vaccine_expiry),
    w.remark ?? '',
  ])

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])

  ws['!cols'] = [
    { wch: 22 }, { wch: 14 }, { wch: 18 }, { wch: 18 }, { wch: 8 },
    { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
    { wch: 16 }, { wch: 18 }, { wch: 20 }, { wch: 30 },
    { wch: 10 }, { wch: 22 }, { wch: 20 },
  ]

  XLSX.utils.book_append_sheet(wb, ws, 'Caregivers')
  const buf: Uint8Array = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  const today = new Date().toISOString().slice(0, 10)
  return new NextResponse(buf as unknown as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="Caregivers_Export_${today}.xlsx"`,
    },
  })
}
