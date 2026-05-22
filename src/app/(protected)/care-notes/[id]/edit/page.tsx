import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { CareNoteForm } from '@/components/care-notes/CareNoteForm'

export default async function EditCareLogPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: noteRaw }, { data: residents }] = await Promise.all([
    supabase.from('care_notes').select('*, profiles(full_name)').eq('id', params.id).single(),
    supabase.from('residents').select('id, full_name').eq('status', 'active').order('full_name'),
  ])

  if (!noteRaw) notFound()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const note = noteRaw as any
  const authorName = note.profiles?.full_name ?? null

  return (
    <>
      <Header title="Edit Care Log" />
      <main className="flex-1 p-6">
        <div className="max-w-2xl mx-auto bg-white rounded-xl border border-gray-200 p-6">
          <CareNoteForm
            residents={residents ?? []}
            defaultResidentId={note.resident_id}
            note={note}
            authorName={authorName}
          />
        </div>
      </main>
    </>
  )
}
