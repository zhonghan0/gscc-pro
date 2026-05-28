import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { isElevated } from '@/lib/permissions'
import { Header } from '@/components/layout/Header'
import { ResidentForm } from '@/components/residents/ResidentForm'
import { DeleteButton } from '@/components/ui/DeleteButton'
import { deleteResident } from '@/actions/residents'
import type { Resident, Worker } from '@/lib/types'

export default async function EditResidentPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single()
  if (!isElevated(profile?.role)) redirect(`/residents/${params.id}`)

  const [{ data: resident }, { data: workers }] = await Promise.all([
    supabase.from('residents').select('*').eq('id', params.id).single(),
    supabase.from('workers').select('id, name, worker_type').eq('status', 'active').eq('worker_type', 'foreign').order('name'),
  ])

  if (!resident) notFound()

  return (
    <>
      <Header
        title={`Edit — ${resident.full_name}`}
        titleNode={
          <span>
            Edit —{' '}
            <Link
              href={`/residents/${params.id}`}
              className="hover:text-blue-600 hover:underline transition-colors"
            >
              {resident.full_name}
            </Link>
          </span>
        }
      />
      <main className="flex-1 p-6">
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <ResidentForm
              resident={resident as Resident}
              workers={(workers ?? []) as Pick<Worker, 'id' | 'name' | 'worker_type'>[]}
            />
          </div>

          {/* Danger zone */}
          <div className="bg-white rounded-xl border border-red-200 p-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-gray-900">Delete Resident</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Permanently removes {resident.full_name} and all associated care notes. This cannot be undone.
              </p>
            </div>
            <DeleteButton
              label={resident.full_name}
              action={async () => { 'use server'; await deleteResident(params.id) }}
            />
          </div>
        </div>
      </main>
    </>
  )
}
