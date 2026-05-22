import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { CareNoteForm } from '@/components/care-notes/CareNoteForm'

export default async function NewCareNotePage({
  searchParams,
}: {
  searchParams: { resident?: string }
}) {
  const supabase = createClient()

  const { data: residents } = await supabase
    .from('residents')
    .select('id, full_name')
    .eq('status', 'active')
    .order('full_name')

  return (
    <>
      <Header title="Care Logs" />
      <main className="flex-1 p-6">
        <div className="max-w-2xl mx-auto bg-white rounded-xl border border-gray-200 p-6">
          <CareNoteForm
            residents={residents ?? []}
            defaultResidentId={searchParams.resident}
          />
        </div>
      </main>
    </>
  )
}
