import { redirect } from 'next/navigation'
import { isElevated } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { PositionsManager } from '@/components/workers/PositionsManager'

export default async function PositionsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single()
  if (!isElevated(profile?.role)) redirect('/dashboard')

  const [{ data: positions }, { data: activeWorkers }] = await Promise.all([
    supabase.from('positions').select('*').order('name'),
    supabase.from('workers').select('position_id').eq('status', 'active').not('position_id', 'is', null),
  ])

  // Build position_id → active worker count map
  const workerCounts: Record<string, number> = {}
  for (const w of activeWorkers ?? []) {
    if (w.position_id) workerCounts[w.position_id] = (workerCounts[w.position_id] ?? 0) + 1
  }

  return (
    <>
      <Header title="Positions" />
      <main className="flex-1 p-6">
        <div className="max-w-xl mx-auto">
          <PositionsManager positions={positions ?? []} workerCounts={workerCounts} />
        </div>
      </main>
    </>
  )
}
