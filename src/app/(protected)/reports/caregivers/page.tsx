import { redirect } from 'next/navigation'
import { canAccessReports } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { CaregiverReportClient } from '@/components/reports/CaregiverReportClient'
import { getSettings } from '@/lib/settings'

export default async function CaregiverReportPage() {
  const { data: { user } } = await createClient().auth.getUser()
  const { data: _profile } = await createClient().from('profiles').select('role').eq('id', user!.id).single()
  if (!canAccessReports(_profile?.role)) redirect('/dashboard')
  const supabase = createClient()

  const [{ data: workers }, { data: residents }, settings] = await Promise.all([
    supabase
      .from('workers')
      .select('id, name, nickname, worker_type, status, passport_expiry, passport_permit_date, typhoid_vaccine_expiry, date_start_work')
      .eq('status', 'active')
      .order('name'),
    supabase
      .from('residents')
      .select('id, full_name, caregiver_id, condition, status')
      .eq('status', 'active'),
    getSettings(),
  ])

  return (
    <>
      <Header title="Caregiver Report" />
      <main className="flex-1 p-6">
        <CaregiverReportClient
          workers={workers ?? []}
          residents={residents ?? []}
          expiryUrgentDays={settings.expiry_urgent_days}
        />
      </main>
    </>
  )
}
