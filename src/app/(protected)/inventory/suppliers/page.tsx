import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { canAccessInventory } from '@/lib/permissions'
import { SupplierManager } from '@/components/inventory/SupplierManager'

export default async function SuppliersPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!canAccessInventory(profile?.role)) redirect('/dashboard')

  const { data: suppliers } = await supabase
    .from('inventory_suppliers')
    .select('*')
    .order('name')

  return (
    <>
      <Header title="Suppliers" />
      <main className="flex-1 p-6">
        <SupplierManager suppliers={suppliers ?? []} />
      </main>
    </>
  )
}
