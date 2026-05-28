import { redirect } from 'next/navigation'
import { canAccessReports } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { ResidentReportClient } from '@/components/reports/ResidentReportClient'
import { getSettings } from '@/lib/settings'

export default async function ResidentReportPage() {
  const { data: { user } } = await createClient().auth.getUser()
  const { data: _profile } = await createClient().from('profiles').select('role').eq('id', user!.id).single()
  if (!canAccessReports(_profile?.role)) redirect('/dashboard')
  const supabase = createClient()

  const [{ data: residents }, settings] = await Promise.all([
    supabase
      .from('residents')
      .select('id, full_name, gender, condition, physio, admission_date, date_of_discharge, status, created_at')
      .order('admission_date', { ascending: true }),
    getSettings(),
  ])

  return (
    <>
      <Header title="Residents Report" />
      <main className="flex-1 p-6">
        <ResidentReportClient residents={residents ?? []} reportMonths={settings.report_default_months} />
      </main>
    </>
  )
}
