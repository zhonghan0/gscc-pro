import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { canAccessInventory } from '@/lib/permissions'
import { NewOrderForm } from '@/components/inventory/NewOrderForm'

export default async function NewOrderPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!canAccessInventory(profile?.role)) redirect('/dashboard')

  const [
    { data: suppliers },
    { data: items },
    { data: prices },
  ] = await Promise.all([
    supabase.from('inventory_suppliers').select('id, name').eq('is_active', true).order('name'),
    supabase.from('inventory_items').select('*').eq('is_active', true).order('category').order('name'),
    supabase.from('inventory_prices').select('item_id, supplier_id, price'),
  ])

  return (
    <>
      <Header title="New Order" />
      <main className="flex-1 p-6">
        <NewOrderForm
          suppliers={suppliers ?? []}
          items={items ?? []}
          prices={prices ?? []}
        />
      </main>
    </>
  )
}
