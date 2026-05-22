import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { HEALTH_CONDITIONS } from '@/lib/constants'

/** Format YYYY-MM-DD as DD/MM/YYYY, or return '' if null */
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

  const { data: residents } = await supabase
    .from('residents')
    .select('*')
    .order('full_name')

  const baseHeaders = [
    'Name', 'NRIC', 'Caregiver', 'Condition', 'Address',
    'DOA', 'Date of Discharge', 'Remark', 'NET', 'Physio', 'Physio Remark', 'Pay day', 'Fees',
  ]
  const headers = [...baseHeaders, ...HEALTH_CONDITIONS, 'Health Remark']

  const rows = (residents ?? []).map(r => {
    const conditions = r.health_condition
      ? r.health_condition.split(',').map((s: string) => s.trim())
      : []

    return [
      r.full_name ?? '',
      r.nric ?? '',
      r.caregiver ?? '',
      r.condition ?? '',
      r.address ?? '',
      fmt(r.admission_date),
      fmt(r.date_of_discharge),
      r.package_remark ?? '',
      r.include_misc === true ? 'Yes' : r.include_misc === false ? 'No' : '',
      r.physio ?? '',
      r.physio_remark ?? '',
      r.pay_day ?? '',
      r.fee ?? '',
      // One column per health condition: 'Yes' if present, else 'No'
      ...HEALTH_CONDITIONS.map(c => (conditions.includes(c) ? 'Yes' : 'No')),
      r.health_remark ?? '',
    ]
  })

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])

  ws['!cols'] = [
    { wch: 24 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 30 },
    { wch: 12 }, { wch: 16 }, { wch: 20 }, { wch: 6 }, { wch: 14 }, { wch: 20 }, { wch: 8 }, { wch: 10 },
    ...HEALTH_CONDITIONS.map(() => ({ wch: 20 })),
    { wch: 25 },
  ]

  XLSX.utils.book_append_sheet(wb, ws, 'Residents')
  const buf: Uint8Array = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  const today = new Date().toISOString().slice(0, 10)
  return new NextResponse(buf as unknown as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="Residents_Export_${today}.xlsx"`,
    },
  })
}
