import { redirect } from 'next/navigation'
import { isElevated } from '@/lib/permissions'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { WorkerImporter } from '@/components/workers/WorkerImporter'
import { ArrowLeft } from 'lucide-react'

export default async function ImportWorkersPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single()
  if (!isElevated(profile?.role)) redirect('/dashboard')

  return (
    <>
      <Header
        title="Import Foreign Workers"
        action={
          <Link href="/admin/workers">
            <Button size="sm" variant="outline"><ArrowLeft className="w-4 h-4" /> Back to Workers</Button>
          </Link>
        }
      />
      <main className="flex-1 p-6">
        <div className="max-w-6xl mx-auto">
          <WorkerImporter />
        </div>
      </main>
    </>
  )
}
