import { redirect } from 'next/navigation'
import { canAccessReports } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { PaymentReportClient } from '@/components/reports/PaymentReportClient'
import { getSettings } from '@/lib/settings'

export default async function PaymentReportPage() {
  const { data: { user } } = await createClient().auth.getUser()
  const { data: _profile } = await createClient().from('profiles').select('role').eq('id', user!.id).single()
  if (!canAccessReports(_profile?.role)) redirect('/dashboard')
  const supabase = createClient()

  const [
    { data: residents },
    { data: payments },
    { data: extraCharges },
    settings,
  ] = await Promise.all([
    supabase
      .from('residents')
      .select('id, full_name, fee, admission_date, date_of_discharge, status')
      .order('full_name'),
    supabase
      .from('payments')
      .select('id, resident_id, for_month, amount, payment_date, full_payment')
      .order('for_month', { ascending: false }),
    supabase
      .from('extra_charges')
      .select('resident_id, billing_month, amount'),
    getSettings(),
  ])

  return (
    <>
      <Header title="Payment Report" />
      <main className="flex-1 p-6">
        <PaymentReportClient
          residents={residents ?? []}
          payments={payments ?? []}
          extraCharges={extraCharges ?? []}
          reportMonths={settings.report_default_months}
        />
      </main>
    </>
  )
}
