import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { CaregiverReportClient } from '@/components/reports/CaregiverReportClient'

export default async function CaregiverReportPage() {
  const supabase = createClient()

  const [{ data: workers }, { data: residents }] = await Promise.all([
    supabase
      .from('workers')
      .select('id, name, nickname, worker_type, status, passport_expiry, passport_permit_date, typhoid_vaccine_expiry, date_start_work')
      .eq('status', 'active')
      .order('name'),
    supabase
      .from('residents')
      .select('id, full_name, caregiver_id, condition, status')
      .eq('status', 'active'),
  ])

  return (
    <>
      <Header title="Caregiver Report" />
      <main className="flex-1 p-6">
        <CaregiverReportClient
          workers={workers ?? []}
          residents={residents ?? []}
        />
      </main>
    </>
  )
}
