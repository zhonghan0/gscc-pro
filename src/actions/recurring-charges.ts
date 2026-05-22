'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// ── CRUD ──────────────────────────────────────────────────────────────────────

export async function createRecurringCharge(data: {
  resident_id: string
  charge_item_id?: string | null
  description: string
  amount: number
  sort_order?: number
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase.from('resident_recurring_charges').insert({
    resident_id: data.resident_id,
    charge_item_id: data.charge_item_id ?? null,
    description: data.description,
    amount: data.amount,
    sort_order: data.sort_order ?? 0,
    active: true,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/extra-charges')
}

export async function updateRecurringCharge(id: string, data: {
  description?: string
  amount?: number
  active?: boolean
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase
    .from('resident_recurring_charges')
    .update(data)
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/extra-charges')
}

export async function deleteRecurringCharge(id: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase
    .from('resident_recurring_charges')
    .delete()
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/extra-charges')
}

// ── Apply ─────────────────────────────────────────────────────────────────────

export async function applyRecurringCharges(residentId: string, billingMonth: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: recurring }, { data: alreadyApplied }] = await Promise.all([
    supabase
      .from('resident_recurring_charges')
      .select('*')
      .eq('resident_id', residentId)
      .eq('active', true),
    supabase
      .from('extra_charges')
      .select('recurring_charge_id')
      .eq('resident_id', residentId)
      .eq('billing_month', billingMonth)
      .not('recurring_charge_id', 'is', null),
  ])

  const appliedIds = new Set((alreadyApplied ?? []).map(a => a.recurring_charge_id))
  const toInsert = (recurring ?? [])
    .filter(r => !appliedIds.has(r.id))
    .map(r => ({
      resident_id: residentId,
      charge_item_id: r.charge_item_id ?? null,
      billing_month: billingMonth,
      charge_date: `${billingMonth}-01`,
      description: r.description,
      amount: r.amount,
      recurring_charge_id: r.id,
    }))

  if (toInsert.length === 0) return 0

  const { error } = await supabase.from('extra_charges').insert(toInsert)
  if (error) throw new Error(error.message)
  revalidatePath('/extra-charges')
  return toInsert.length
}

export async function applyAllRecurringCharges(billingMonth: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: recurring }, { data: alreadyApplied }] = await Promise.all([
    supabase
      .from('resident_recurring_charges')
      .select('*')
      .eq('active', true),
    supabase
      .from('extra_charges')
      .select('recurring_charge_id')
      .eq('billing_month', billingMonth)
      .not('recurring_charge_id', 'is', null),
  ])

  const appliedIds = new Set((alreadyApplied ?? []).map(a => a.recurring_charge_id))
  const toInsert = (recurring ?? [])
    .filter(r => !appliedIds.has(r.id))
    .map(r => ({
      resident_id: r.resident_id,
      charge_item_id: r.charge_item_id ?? null,
      billing_month: billingMonth,
      charge_date: `${billingMonth}-01`,
      description: r.description,
      amount: r.amount,
      recurring_charge_id: r.id,
    }))

  if (toInsert.length === 0) return 0

  const { error } = await supabase.from('extra_charges').insert(toInsert)
  if (error) throw new Error(error.message)
  revalidatePath('/extra-charges')
  return toInsert.length
}
