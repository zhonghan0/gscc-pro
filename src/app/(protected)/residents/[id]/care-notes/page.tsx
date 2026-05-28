import { notFound } from 'next/navigation'
import Link from 'next/link'
import { isElevated } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { CareNoteList } from '@/components/care-notes/CareNoteList'
import { Button } from '@/components/ui/button'
import { ClipboardList } from 'lucide-react'
import type { CareNoteWithAuthor } from '@/lib/types'

export default async function ResidentCareNotesPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const [{ data: resident }, { data: { user } }] = await Promise.all([
    supabase.from('residents').select('id, full_name').eq('id', params.id).single(),
    supabase.auth.getUser(),
  ])

  if (!resident) notFound()

  const [{ data: profile }, { data: notes }] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user!.id).single(),
    supabase
      .from('care_notes')
      .select('*, profiles(full_name)')
      .eq('resident_id', params.id)
      .order('note_date', { ascending: false }),
  ])

  const isAdmin = isElevated(profile?.role)

  return (
    <>
      <Header
        title={`${resident.full_name} — Care Notes`}
        action={
          <Link href={`/care-notes/new?resident=${params.id}`}>
            <Button size="sm">
              <ClipboardList className="w-4 h-4" /> Add Note
            </Button>
          </Link>
        }
      />
      <main className="flex-1 p-6">
        <div className="max-w-2xl mx-auto space-y-4">
          <p className="text-sm text-gray-500">{notes?.length ?? 0} notes total</p>
          <CareNoteList
            notes={(notes ?? []) as CareNoteWithAuthor[]}
            isAdmin={isAdmin}
            residentId={params.id}
          />
        </div>
      </main>
    </>
  )
}
