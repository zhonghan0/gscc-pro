import { redirect } from 'next/navigation'
import { canAccessReports } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { RevenueReportClient } from '@/components/reports/RevenueReportClient'
import { getSettings } from '@/lib/settings'

export default async function RevenueReportPage() {
  const { data: { user } } = await createClient().auth.getUser()
  const { data: _profile } = await createClient().from('profiles').select('role').eq('id', user!.id).single()
  if (!canAccessReports(_profile?.role)) redirect('/dashboard')
  const supabase = createClient()

  const [
    { data: residents },
    { data: payments },
    { data: extraCharges },
    { data: chargeItems },
    settings,
  ] = await Promise.all([
    supabase
      .from('residents')
      .select('id, fee, admission_date, date_of_discharge, status')
      .order('full_name'),
    supabase
      .from('payments')
      .select('resident_id, for_month, amount, full_payment')
      .order('for_month', { ascending: false }),
    supabase
      .from('extra_charges')
      .select('id, resident_id, billing_month, amount, quantity, description, charge_item_id')
      .order('billing_month', { ascending: false }),
    supabase
      .from('charge_items')
      .select('id, name, unit, category')
      .order('sort_order'),
    getSettings(),
  ])

  return (
    <>
      <Header title="Revenue Report" />
      <main className="flex-1 p-6">
        <RevenueReportClient
          residents={residents ?? []}
          payments={payments ?? []}
          extraCharges={extraCharges ?? []}
          chargeItems={chargeItems ?? []}
          reportMonths={settings.report_default_months}
          paymentRateGreenThreshold={settings.payment_rate_green_threshold}
          paymentRateYellowThreshold={settings.payment_rate_yellow_threshold}
        />
      </main>
    </>
  )
}
