import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { StatementImporter } from '@/components/payments/StatementImporter'

export default async function ImportPaymentsPage() {
  const supabase = createClient()

  const { data: residents } = await supabase
    .from('residents')
    .select('id, full_name')
    .eq('status', 'active')
    .order('full_name')

  return (
    <>
      <Header title="Import Bank Statement" />
      <main className="flex-1 p-6">
        <StatementImporter residents={residents ?? []} />
      </main>
    </>
  )
}
