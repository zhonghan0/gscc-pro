'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createDriverPayout(data: {
  worker_id: string
  notes?: string
}) {
  const supabase = createClient()
  const { data: created, error } = await supabase
    .from('driver_payouts')
    .insert(data)
    .select('id')
    .single()
  if (error) throw new Error(error.message)
  revalidatePath('/driver-payouts')
  return created.id as string
}

export async function updateDriverPayout(id: string, data: {
  worker_id?: string
  notes?: string
  finalized?: boolean
}) {
  const supabase = createClient()
  const { error } = await supabase.from('driver_payouts').update(data).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/driver-payouts')
  revalidatePath(`/driver-payouts/${id}`)
}

export async function deleteDriverPayout(id: string) {
  const supabase = createClient()
  const { error } = await supabase.from('driver_payouts').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/driver-payouts')
}

export async function createDriverPayoutTrip(data: {
  payout_id: string
  trip_date?: string | null
  description: string
  transport_amount: number
  bill_amount: number
  sort_order?: number
  resident_id?: string | null
}) {
  const supabase = createClient()
  const { data: created, error } = await supabase
    .from('driver_payout_trips')
    .insert(data)
    .select('id')
    .single()
  if (error) throw new Error(error.message)
  revalidatePath(`/driver-payouts/${data.payout_id}`)
  return created.id as string
}

export async function updateDriverPayoutTrip(id: string, payoutId: string, data: {
  trip_date?: string | null
  description?: string
  transport_amount?: number
  bill_amount?: number
  sort_order?: number
}) {
  const supabase = createClient()
  const { error } = await supabase.from('driver_payout_trips').update(data).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath(`/driver-payouts/${payoutId}`)
}

export async function deleteDriverPayoutTrip(id: string, payoutId: string) {
  const supabase = createClient()
  const { error } = await supabase.from('driver_payout_trips').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath(`/driver-payouts/${payoutId}`)
}
