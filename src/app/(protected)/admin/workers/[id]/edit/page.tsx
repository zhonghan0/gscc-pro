import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { WorkerForm } from '@/components/workers/WorkerForm'
import { DeleteButton } from '@/components/ui/DeleteButton'
import { deleteWorker } from '@/actions/workers'
import type { Worker } from '@/lib/types'

export default async function EditWorkerPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const [{ data: worker }, { data: positions }] = await Promise.all([
    supabase.from('workers').select('*').eq('id', params.id).single(),
    supabase.from('positions').select('*').order('name'),
  ])

  if (!worker) notFound()

  return (
    <>
      <Header title={`Edit — ${worker.name}`} />
      <main className="flex-1 p-6">
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <WorkerForm
              worker={worker as Worker}
              positions={positions ?? []}
            />
          </div>

          {/* Danger zone */}
          <div className="bg-white rounded-xl border border-red-200 p-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-gray-900">Delete Worker</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Permanently removes {worker.name} from the system. This cannot be undone.
              </p>
            </div>
            <DeleteButton
              label={worker.name}
              action={async () => { 'use server'; await deleteWorker(params.id) }}
            />
          </div>
        </div>
      </main>
    </>
  )
}
