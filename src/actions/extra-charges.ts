'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

// ── Charge Items (catalog) ────────────────────────────────────────────────────

export async function createChargeItem(data: {
  name: string
  default_price: number
  unit?: string
  sort_order?: number
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: created, error } = await supabase
    .from('charge_items')
    .insert({
      name: data.name,
      default_price: data.default_price,
      unit: data.unit || null,
      sort_order: data.sort_order ?? 0,
    })
    .select('id, name, default_price, unit')
    .single()
  if (error) throw new Error(error.message)
  revalidatePath('/admin/charge-items')
  return created as { id: string; name: string; default_price: number; unit: string | null }
}

export async function updateChargeItem(id: string, data: {
  name: string
  default_price: number
  unit?: string
  sort_order?: number
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase.from('charge_items').update({
    name: data.name,
    default_price: data.default_price,
    unit: data.unit || null,
    sort_order: data.sort_order ?? 0,
  }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/charge-items')
  revalidatePath('/residents')
}

export async function deleteChargeItem(id: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase.from('charge_items').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/charge-items')
}

// ── Resident price overrides ──────────────────────────────────────────────────

export async function upsertResidentChargePrice(
  residentId: string,
  chargeItemId: string,
  price: number
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase.from('resident_charge_prices').upsert({
    resident_id: residentId,
    charge_item_id: chargeItemId,
    price,
  }, { onConflict: 'resident_id,charge_item_id' })
  if (error) throw new Error(error.message)
  revalidatePath(`/residents/${residentId}`)
}

export async function deleteResidentChargePrice(residentId: string, chargeItemId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase
    .from('resident_charge_prices')
    .delete()
    .eq('resident_id', residentId)
    .eq('charge_item_id', chargeItemId)
  if (error) throw new Error(error.message)
  revalidatePath(`/residents/${residentId}`)
}

// ── Extra charges ─────────────────────────────────────────────────────────────

export async function createExtraCharge(data: {
  resident_id: string
  charge_item_id?: string | null
  billing_month: string
  charge_date?: string | null
  description: string
  amount: number        // unit price — stored amount = amount × quantity
  quantity?: number
  notes?: string
  recurring_charge_id?: string | null
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const qty = data.quantity ?? 1
  const { error } = await supabase.from('extra_charges').insert({
    resident_id: data.resident_id,
    charge_item_id: data.charge_item_id || null,
    billing_month: data.billing_month,
    charge_date: data.charge_date || null,
    description: data.description,
    amount: data.amount * qty,
    quantity: qty,
    notes: data.notes || null,
    created_by: user.id,
    recurring_charge_id: data.recurring_charge_id ?? null,
  })
  if (error) throw new Error(error.message)
  revalidatePath(`/residents/${data.resident_id}`)
}

export async function updateExtraCharge(id: string, data: {
  charge_date: string
  description: string
  amount: number
  billing_month: string
  notes?: string
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase.from('extra_charges').update({
    charge_date: data.charge_date,
    description: data.description,
    amount: data.amount,
    billing_month: data.billing_month,
    notes: data.notes || null,
  }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/residents')
}

export async function deleteExtraCharge(id: string, residentId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Unauthorized')

  const { error } = await supabase.from('extra_charges').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath(`/residents/${residentId}`)
}
