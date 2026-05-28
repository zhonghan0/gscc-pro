import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { ImportHub } from '@/components/admin/ImportHub'
import { getSettings } from '@/lib/settings'

export default async function ImportDataPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const [{ data: positions }, settings] = await Promise.all([
    supabase.from('positions').select('id, name').order('name'),
    getSettings(),
  ])

  return (
    <>
      <Header title="Import Data" />
      <main className="flex-1 p-6">
        <div className="max-w-6xl mx-auto">
          <ImportHub positions={positions ?? []} careLogPreviewChars={settings.care_log_preview_chars} />
        </div>
      </main>
    </>
  )
}
