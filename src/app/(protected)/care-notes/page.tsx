import Link from 'next/link'
import { isElevated } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { CareLogsTable } from '@/components/care-notes/CareLogsTable'
import { Plus } from 'lucide-react'

export default async function CareLogsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single()
  const isAdmin = isElevated(profile?.role)

  const { data: notes } = await supabase
    .from('care_notes')
    .select('*, profiles(full_name), residents(full_name)')
    .order('note_date', { ascending: false })

  return (
    <>
      <Header
        title="Care Logs"
        action={
          <Link href="/care-notes/new">
            <Button size="sm"><Plus className="w-4 h-4" /> Add Log</Button>
          </Link>
        }
      />
      <main className="flex-1 p-6">
        <CareLogsTable notes={notes ?? []} isAdmin={isAdmin} />
      </main>
    </>
  )
}
