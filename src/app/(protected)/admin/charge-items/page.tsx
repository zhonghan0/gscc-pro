import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { ChargeItemsManager } from '@/components/extra-charges/ChargeItemsManager'

export default async function ChargeItemsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: items } = await supabase
    .from('charge_items')
    .select('*')
    .order('sort_order')
    .order('name')

  return (
    <>
      <Header title="Charge Items" />
      <main className="flex-1 p-6">
        <div className="max-w-2xl mx-auto">
          <ChargeItemsManager items={items ?? []} />
        </div>
      </main>
    </>
  )
}
