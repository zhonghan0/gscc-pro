import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { ResidentReportClient } from '@/components/reports/ResidentReportClient'

export default async function ResidentReportPage() {
  const supabase = createClient()

  const { data: residents } = await supabase
    .from('residents')
    .select('id, full_name, gender, condition, physio, admission_date, date_of_discharge, status, created_at')
    .order('admission_date', { ascending: true })

  return (
    <>
      <Header title="Residents Report" />
      <main className="flex-1 p-6">
        <ResidentReportClient residents={residents ?? []} />
      </main>
    </>
  )
}
