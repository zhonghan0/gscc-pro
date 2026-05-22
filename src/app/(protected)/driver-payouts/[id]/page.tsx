import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { DriverPayoutDetail } from '@/components/driver-payouts/DriverPayoutDetail'

interface Props {
  params: { id: string }
}

export default async function DriverPayoutDetailPage({ params }: Props) {
  const supabase = createClient()

  const [{ data: payout }, { data: trips }, { data: allDescRows }] = await Promise.all([
    supabase
      .from('driver_payouts')
      .select('id, worker_id, notes, finalized')
      .eq('id', params.id)
      .single(),
    supabase
      .from('driver_payout_trips')
      .select('id, trip_date, description, transport_amount, bill_amount, sort_order')
      .eq('payout_id', params.id)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
    supabase
      .from('driver_payout_trips')
      .select('description'),
  ])

  const knownDescriptions = Array.from(
    new Set((allDescRows ?? []).map(r => r.description).filter(Boolean))
  ).sort()

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

  return (
    <DriverPayoutDetail
      payout={{ ...payout, worker }}
      trips={trips ?? []}
      knownDescriptions={knownDescriptions}
    />
  )
}
