import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { ExportHub } from '@/components/admin/ExportHub'

export default async function ExportDataPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  return (
    <>
      <Header title="Export Data" />
      <main className="flex-1 p-6">
        <div className="max-w-3xl mx-auto">
          <ExportHub />
        </div>
      </main>
    </>
  )
}
