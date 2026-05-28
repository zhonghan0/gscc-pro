import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DriverPayoutPageClient } from '@/components/driver-payouts/DriverPayoutPageClient'
import { canAccessBilling } from '@/lib/permissions'

export default async function DriverPayoutsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single()
  if (!canAccessBilling(profile?.role)) redirect('/dashboard')

  const [{ data: payouts }, { data: allTrips }, { data: workers }] = await Promise.all([
    supabase
      .from('driver_payouts')
      .select('id, worker_id, notes, finalized, created_at')
      .order('created_at', { ascending: false }),
    supabase
      .from('driver_payout_trips')
      .select('payout_id, transport_amount, bill_amount, trip_date'),
    supabase
      .from('workers')
      .select('id, name, nickname')
      .eq('status', 'active')
      .eq('worker_type', 'local')
      .order('name'),
  ])

  const tripsByPayout = new Map<string, { transport_amount: number; bill_amount: number; trip_date: string | null }[]>()
  for (const t of allTrips ?? []) {
    const arr = tripsByPayout.get(t.payout_id) ?? []
    arr.push(t)
    tripsByPayout.set(t.payout_id, arr)
  }

  const workerMap = new Map((workers ?? []).map(w => [w.id, w]))

  const enriched = (payouts ?? []).map(p => {
    const trips = tripsByPayout.get(p.id) ?? []
    return {
      ...p,
      trip_count: trips.length,
      transport_total: trips.reduce((s, t) => s + t.transport_amount, 0),
      bill_total: trips.reduce((s, t) => s + t.bill_amount, 0),
      trip_dates: trips.map(t => t.trip_date),
      worker: p.worker_id ? (workerMap.get(p.worker_id) ?? null) : null,
    }
  })

  return <DriverPayoutPageClient payouts={enriched} workers={workers ?? []} />
}
