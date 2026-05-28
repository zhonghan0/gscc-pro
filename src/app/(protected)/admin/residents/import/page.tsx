import { redirect } from 'next/navigation'
import { isElevated } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { ResidentImporter } from '@/components/residents/ResidentImporter'

export default async function ImportResidentsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single()
  if (!isElevated(profile?.role)) redirect('/residents')

  return (
    <>
      <Header title="Import Residents from Excel" />
      <main className="flex-1 p-6">
        <div className="max-w-6xl mx-auto space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-700">
            <strong>How it works:</strong> Upload your Excel file, review the preview, then click <em>Import All</em>.
            NRIC numbers will automatically fill in Date of Birth and Gender.
            Residents that already exist in the database will be skipped if they cause a conflict.
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <ResidentImporter />
          </div>
        </div>
      </main>
    </>
  )
}
