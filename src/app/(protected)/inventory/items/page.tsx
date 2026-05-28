import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { canAccessInventory } from '@/lib/permissions'
import { ItemManager } from '@/components/inventory/ItemManager'

export default async function ItemsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!canAccessInventory(profile?.role)) redirect('/dashboard')

  const { data: items } = await supabase
    .from('inventory_items')
    .select('*')
    .order('category')
    .order('name')

  return (
    <>
      <Header title="Products" />
      <main className="flex-1 p-6">
        <ItemManager items={items ?? []} />
      </main>
    </>
  )
}
