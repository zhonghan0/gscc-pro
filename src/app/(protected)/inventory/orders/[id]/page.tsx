import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { canAccessInventory } from '@/lib/permissions'
import { OrderDetail } from '@/components/inventory/OrderDetail'

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!canAccessInventory(profile?.role)) redirect('/dashboard')

  const { data: order } = await supabase
    .from('inventory_orders')
    .select(`
      id, order_date, status, notes, created_at,
      inventory_suppliers(id, name),
      inventory_order_items(
        id, quantity, unit_price,
        inventory_items(id, name, unit, category)
      )
    `)
    .eq('id', params.id)
    .single()

  if (!order) notFound()

  return (
    <>
      <Header title="Order Detail" />
      <main className="flex-1 p-6">
        <OrderDetail order={order as any} canEdit={canAccessInventory(profile?.role)} />
      </main>
    </>
  )
}
