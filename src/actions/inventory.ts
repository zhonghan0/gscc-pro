'use server'
import { isElevated } from '@/lib/permissions'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

async function assertElevated() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!isElevated(profile?.role)) throw new Error('Unauthorized')
  return { supabase, userId: user.id }
}

// ── Suppliers ─────────────────────────────────────────────────────────────────

export async function createSupplier(data: {
  name: string
  contact_person?: string
  phone?: string
  notes?: string
}) {
  const { supabase } = await assertElevated()
  const { error } = await supabase.from('inventory_suppliers').insert({
    name: data.name,
    contact_person: data.contact_person || null,
    phone: data.phone || null,
    notes: data.notes || null,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/inventory/suppliers')
  revalidatePath('/inventory/prices')
}

export async function updateSupplier(id: string, data: {
  name: string
  contact_person?: string
  phone?: string
  notes?: string
}) {
  const { supabase } = await assertElevated()
  const { error } = await supabase.from('inventory_suppliers').update({
    name: data.name,
    contact_person: data.contact_person || null,
    phone: data.phone || null,
    notes: data.notes || null,
  }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/inventory/suppliers')
  revalidatePath('/inventory/prices')
}

export async function deleteSupplier(id: string) {
  const { supabase } = await assertElevated()
  const { error } = await supabase.from('inventory_suppliers').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/inventory/suppliers')
  revalidatePath('/inventory/prices')
}

// ── Items ─────────────────────────────────────────────────────────────────────

export async function createItem(data: {
  category: 'diaper' | 'underpad' | 'wet_wipes' | 'others'
  name: string
  unit: string
  notes?: string
  brand?: string
  diaper_type?: 'tape' | 'pant' | null
  size?: string
  bags_per_carton?: number | null
  pcs_per_bag?: number | null
}) {
  const { supabase } = await assertElevated()
  const { error } = await supabase.from('inventory_items').insert({
    category: data.category,
    name: data.name,
    unit: data.unit,
    notes: data.notes || null,
    brand: data.brand || null,
    diaper_type: data.diaper_type || null,
    size: data.size || null,
    bags_per_carton: data.bags_per_carton || null,
    pcs_per_bag: data.pcs_per_bag || null,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/inventory/items')
  revalidatePath('/inventory/prices')
}

export async function updateItem(id: string, data: {
  category: 'diaper' | 'underpad' | 'wet_wipes' | 'others'
  name: string
  unit: string
  notes?: string
  brand?: string
  diaper_type?: 'tape' | 'pant' | null
  size?: string
  bags_per_carton?: number | null
  pcs_per_bag?: number | null
}) {
  const { supabase } = await assertElevated()
  const { error } = await supabase.from('inventory_items').update({
    category: data.category,
    name: data.name,
    unit: data.unit,
    notes: data.notes || null,
    brand: data.brand || null,
    diaper_type: data.diaper_type || null,
    size: data.size || null,
    bags_per_carton: data.bags_per_carton || null,
    pcs_per_bag: data.pcs_per_bag || null,
  }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/inventory/items')
  revalidatePath('/inventory/prices')
}

export async function deleteItem(id: string) {
  const { supabase } = await assertElevated()
  const { error } = await supabase.from('inventory_items').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/inventory/items')
  revalidatePath('/inventory/prices')
}

// ── Prices ────────────────────────────────────────────────────────────────────

export async function upsertPrice(data: {
  item_id: string
  supplier_id: string
  price: number
  effective_date: string
  notes?: string
}) {
  const { supabase } = await assertElevated()
  const { error } = await supabase.from('inventory_prices').upsert({
    item_id: data.item_id,
    supplier_id: data.supplier_id,
    price: data.price,
    effective_date: data.effective_date,
    notes: data.notes || null,
  }, { onConflict: 'item_id,supplier_id' })
  if (error) throw new Error(error.message)
  revalidatePath('/inventory/prices')
}

export async function deletePrice(id: string) {
  const { supabase } = await assertElevated()
  const { error } = await supabase.from('inventory_prices').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/inventory/prices')
}

// ── Orders ────────────────────────────────────────────────────────────────────

export async function createOrder(data: {
  order_date: string
  supplier_id: string
  notes?: string
  items: { item_id: string; quantity: number; unit_price: number }[]
}) {
  const { supabase, userId } = await assertElevated()

  const { data: order, error: orderErr } = await supabase
    .from('inventory_orders')
    .insert({
      order_date: data.order_date,
      supplier_id: data.supplier_id,
      notes: data.notes || null,
      created_by: userId,
    })
    .select('id')
    .single()
  if (orderErr) throw new Error(orderErr.message)

  const lineItems = data.items.map(i => ({
    order_id: order.id,
    item_id: i.item_id,
    quantity: i.quantity,
    unit_price: i.unit_price,
  }))
  const { error: itemsErr } = await supabase.from('inventory_order_items').insert(lineItems)
  if (itemsErr) throw new Error(itemsErr.message)

  revalidatePath('/inventory/orders')
  redirect(`/inventory/orders/${order.id}`)
}

export async function updateOrderStatus(id: string, status: 'pending' | 'received' | 'cancelled') {
  const { supabase } = await assertElevated()
  const { error } = await supabase.from('inventory_orders').update({ status }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/inventory/orders')
  revalidatePath(`/inventory/orders/${id}`)
}

export async function deleteOrder(id: string) {
  const { supabase } = await assertElevated()
  const { error } = await supabase.from('inventory_orders').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/inventory/orders')
  redirect('/inventory/orders')
}
