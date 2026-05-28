import { redirect } from 'next/navigation'
import { isElevated } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { ChargeItemsManager } from '@/components/extra-charges/ChargeItemsManager'
import { getSettings } from '@/lib/settings'

export default async function ChargeItemsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single()
  if (!isElevated(profile?.role)) redirect('/dashboard')

  const [{ data: items }, settings] = await Promise.all([
    supabase.from('charge_items').select('*').order('sort_order').order('name'),
    getSettings(),
  ])

  return (
    <>
      <Header title="Charge Items" />
      <main className="flex-1 p-6">
        <div className="max-w-5xl mx-auto">
          <ChargeItemsManager
            items={items ?? []}
            defaultTransportItemPrice={settings.transport_item_default_price}
          />
        </div>
      </main>
    </>
  )
}
