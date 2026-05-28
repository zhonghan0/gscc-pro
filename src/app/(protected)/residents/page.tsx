import Link from 'next/link'
import { isElevated } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { ResidentTable } from '@/components/residents/ResidentTable'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export default async function ResidentsPage() {
  const supabase = createClient()

  const [{ data: residents }, { data: { user } }] = await Promise.all([
    supabase.from('residents').select('*, workers(name, nickname)').order('full_name'),
    supabase.auth.getUser(),
  ])

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user!.id)
    .single()

  const isAdmin = isElevated(profile?.role)

  return (
    <>
      <Header
        title="Residents"
        action={
          isAdmin && (
            <Link href="/residents/new">
              <Button size="sm">
                <Plus className="w-4 h-4" /> Add Resident
              </Button>
            </Link>
          )
        }
      />
      <main className="flex-1 p-6">
        <ResidentTable residents={residents ?? []} isAdmin={isAdmin} />
      </main>
    </>
  )
}
