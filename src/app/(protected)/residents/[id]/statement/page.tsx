import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { StatementView } from '@/components/extra-charges/StatementView'

interface Props {
  params: { id: string }
  searchParams: { month?: string }
}

export default async function StatementPage({ params, searchParams }: Props) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const month = searchParams.month ?? currentMonth

  const [{ data: resident }, { data: charges }] = await Promise.all([
    supabase.from('residents').select('id, full_name, fee').eq('id', params.id).single(),
    supabase
      .from('extra_charges')
      .select('id, charge_date, description, amount, quantity, notes')
      .eq('resident_id', params.id)
      .eq('billing_month', month)
      .order('charge_date')
      .order('created_at'),
  ])

  if (!resident) notFound()

  return (
    <StatementView
      resident={resident}
      month={month}
      charges={charges ?? []}
      currentMonth={currentMonth}
    />
  )
}
