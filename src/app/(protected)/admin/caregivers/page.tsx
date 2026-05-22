import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { WorkerTable } from '@/components/workers/WorkerTable'
import { Plus } from 'lucide-react'

export default async function CaregiversPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: workersRaw } = await supabase
    .from('workers')
    .select('*, positions(name)')
    .eq('worker_type', 'foreign')
    .order('name')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const workers = (workersRaw ?? []) as any[]

  return (
    <>
      <Header
        title="Caregiver"
        action={
          <Link href="/admin/workers/new?type=foreign">
            <Button size="sm"><Plus className="w-4 h-4" /> Add Caregiver</Button>
          </Link>
        }
      />
      <main className="flex-1 p-6">
        <WorkerTable workers={workers} workerType="foreign" isAdmin emptyLabel="No caregivers yet." defaultHideNoPermit />
      </main>
    </>
  )
}
