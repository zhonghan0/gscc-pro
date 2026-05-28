import { redirect } from 'next/navigation'
import { isElevated } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { WorkerForm } from '@/components/workers/WorkerForm'

export default async function NewWorkerPage({ searchParams }: { searchParams: { type?: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single()
  if (!isElevated(profile?.role)) redirect('/dashboard')

  const { data: positions } = await supabase.from('positions').select('*').order('name')

  const defaultWorkerType = searchParams.type === 'foreign' ? 'foreign'
    : searchParams.type === 'local' ? 'local'
    : undefined

  const title = defaultWorkerType === 'foreign' ? 'Add Caregiver'
    : defaultWorkerType === 'local' ? 'Add Local Worker'
    : 'Add Worker'

  return (
    <>
      <Header title={title} />
      <main className="flex-1 p-6">
        <div className="max-w-3xl mx-auto bg-white rounded-xl border border-gray-200 p-6">
          <WorkerForm positions={positions ?? []} defaultWorkerType={defaultWorkerType} />
        </div>
      </main>
    </>
  )
}
