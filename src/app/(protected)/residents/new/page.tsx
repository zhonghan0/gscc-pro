import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { ResidentForm } from '@/components/residents/ResidentForm'

export default async function NewResidentPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single()
  if (profile?.role !== 'admin') redirect('/residents')

  const { data: workers } = await supabase
    .from('workers')
    .select('id, name, worker_type')
    .eq('status', 'active')
    .eq('worker_type', 'foreign')
    .order('name')

  return (
    <>
      <Header title="Add New Resident" />
      <main className="flex-1 p-6">
        <div className="max-w-3xl mx-auto bg-white rounded-xl border border-gray-200 p-6">
          <ResidentForm workers={workers ?? []} />
        </div>
      </main>
    </>
  )
}
