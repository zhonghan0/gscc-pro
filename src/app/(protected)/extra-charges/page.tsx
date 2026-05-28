import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { ExtraChargesHub } from '@/components/extra-charges/ExtraChargesHub'
import { canAccessBilling, isElevated } from '@/lib/permissions'

export default async function ExtraChargesPage({
  searchParams,
}: {
  searchParams: { month?: string }
}) {
  const supabase = createClient()

  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const hasExplicitMonth = !!searchParams.month
  const month = searchParams.month ?? currentMonth

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 1st day of 2 months ago — discharged residents after this date are still shown
  const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1)
  const twoMonthsAgoStr = `${twoMonthsAgo.getFullYear()}-${String(twoMonthsAgo.getMonth() + 1).padStart(2, '0')}-01`

  const [
    { data: profileData },
    { data: activeResidents },
    { data: recentlyDischarged },
    { data: charges },
    { data: chargeItems },
    { data: residentPrices },
    { data: recurringCharges },
  ] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user.id).single(),
    supabase
      .from('residents')
      .select('id, full_name, fee, status, date_of_discharge')
      .eq('status', 'active')
      .order('full_name'),
    supabase
      .from('residents')
      .select('id, full_name, fee, status, date_of_discharge')
      .eq('status', 'discharged')
      .gte('date_of_discharge', twoMonthsAgoStr)
      .order('full_name'),
    supabase
      .from('extra_charges')
      .select('id, resident_id, charge_date, description, amount, billing_month, notes, recurring_charge_id')
      .eq('billing_month', month)
      .order('charge_date'),
    supabase
      .from('charge_items')
      .select('*')
      .order('sort_order')
      .order('name'),
    supabase
      .from('resident_charge_prices')
      .select('resident_id, charge_item_id, price'),
    supabase
      .from('resident_recurring_charges')
      .select('id, resident_id, charge_item_id, description, amount, active, sort_order')
      .order('sort_order'),
  ])

  const role = (profileData as { role: string } | null)?.role
  if (!canAccessBilling(role)) redirect('/dashboard')
  const isAdmin = isElevated(role)

  // Active first, then recently discharged (sorted by name within each group)
  const residents = [
    ...(activeResidents ?? []),
    ...(recentlyDischarged ?? []),
  ]

  return (
    <>
      <Header title="Extra Charges" />
      <main className="flex-1 p-6">
        <ExtraChargesHub
          month={month}
          currentMonth={currentMonth}
          hasExplicitMonth={hasExplicitMonth}
          residents={residents as any}
          charges={(charges ?? []) as any}
          chargeItems={(chargeItems ?? []) as any}
          residentPrices={(residentPrices ?? []) as any}
          recurringCharges={(recurringCharges ?? []) as any}
          isAdmin={isAdmin}
        />
      </main>
    </>
  )
}
