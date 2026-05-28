import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { DriverPayoutDetail } from '@/components/driver-payouts/DriverPayoutDetail'
import { getSettings } from '@/lib/settings'

interface Props {
  params: { id: string }
}

export default async function DriverPayoutDetailPage({ params }: Props) {
  const supabase = createClient()

  const [{ data: payout }, { data: trips }, { data: chargeItems }, { data: residents }, settings] = await Promise.all([
    supabase
      .from('driver_payouts')
      .select('id, worker_id, notes, finalized')
      .eq('id', params.id)
      .single(),
    supabase
      .from('driver_payout_trips')
      .select('id, trip_date, description, transport_amount, bill_amount, sort_order, resident_id')
      .eq('payout_id', params.id)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
    supabase
      .from('charge_items')
      .select('id, name, default_price, category')
      .in('category', ['Transportation', 'Clinic Bills'])
      .order('name'),
    supabase
      .from('residents')
      .select('id, full_name')
      .eq('status', 'active')
      .order('full_name'),
    getSettings(),
  ])

  if (!payout) notFound()

  let worker: { id: string; name: string; nickname: string | null } | null = null
  if (payout.worker_id) {
    const { data } = await supabase
      .from('workers')
      .select('id, name, nickname')
      .eq('id', payout.worker_id)
      .single()
    worker = data ?? null
  }

  // Build a map of resident id → full_name for trip display
  const residentMap = new Map((residents ?? []).map(r => [r.id, r.full_name]))

  const enrichedTrips = (trips ?? []).map(t => ({
    id: t.id,
    trip_date: t.trip_date,
    description: t.description,
    transport_amount: t.transport_amount,
    bill_amount: t.bill_amount,
    sort_order: t.sort_order,
    resident_id: t.resident_id ?? null,
    resident_name: t.resident_id ? (residentMap.get(t.resident_id) ?? null) : null,
  }))

  const transportationItems = (chargeItems ?? [])
    .filter(c => c.category === 'Transportation')
    .map(c => ({ id: c.id, name: c.name, default_price: c.default_price }))

  const clinicBillsItemId = (chargeItems ?? []).find(c => c.category === 'Clinic Bills')?.id ?? null

  return (
    <DriverPayoutDetail
      payout={{ ...payout, worker }}
      trips={enrichedTrips}
      transportationItems={transportationItems}
      clinicBillsItemId={clinicBillsItemId}
      residents={(residents ?? []).map(r => ({ id: r.id, name: r.full_name }))}
      defaultTransportAmount={settings.driver_transport_default}
    />
  )
}
