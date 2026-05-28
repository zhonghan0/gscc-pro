import Link from 'next/link'
import { redirect } from 'next/navigation'
import { isElevated } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { WorkerTable } from '@/components/workers/WorkerTable'
import { Plus } from 'lucide-react'

export default async function LocalWorkersPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single()
  if (!isElevated(profile?.role)) redirect('/dashboard')

  const { data: workersRaw } = await supabase
    .from('workers')
    .select('*, positions(name)')
    .eq('worker_type', 'local')
    .order('name')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const workers = (workersRaw ?? []) as any[]

  return (
    <>
      <Header
        title="Local Worker"
        action={
          <Link href="/admin/workers/new?type=local">
            <Button size="sm"><Plus className="w-4 h-4" /> Add Local Worker</Button>
          </Link>
        }
      />
      <main className="flex-1 p-6">
        <WorkerTable workers={workers} workerType="local" isAdmin emptyLabel="No local workers yet." />
      </main>
    </>
  )
}
