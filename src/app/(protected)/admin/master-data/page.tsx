import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { MasterDataManager } from '@/components/admin/MasterDataManager'

export default async function MasterDataPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: settings } = await (supabase as any)
    .from('app_settings')
    .select('key, value, label, description, category, updated_at')
    .order('category')
    .order('key') as { data: { key: string; value: string; label: string; description: string | null; category: string; updated_at: string }[] | null }

  return (
    <>
      <Header title="Master Data" />
      <main className="flex-1 p-6">
        <div className="max-w-3xl mx-auto space-y-2">
          <p className="text-sm text-gray-500 mb-6">
            Configure system-wide default values. These replace hardcoded numbers throughout the app — update here instead of in code.
          </p>
          <MasterDataManager settings={settings ?? []} />
        </div>
      </main>
    </>
  )
}
