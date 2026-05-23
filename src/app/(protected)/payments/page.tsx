import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { PaymentsTable } from '@/components/payments/PaymentsTable'
import { PaymentsCalendar } from '@/components/payments/PaymentsCalendar'
import { Plus, Upload, LayoutGrid, List, EyeOff, Eye } from 'lucide-react'

interface Props {
  searchParams: { view?: string; highlight?: string; show_inactive?: string }
}

export default async function PaymentsPage({ searchParams }: Props) {
  const view = searchParams.view === 'list' ? 'list' : 'grid'
  const highlight = searchParams.highlight ?? null
  const showInactive = searchParams.show_inactive === '1'

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single()
  const isAdmin = profile?.role === 'admin'

  const { data: payments } = await supabase
    .from('payments')
    .select('*, residents(full_name, status)')
    .order('payment_date', { ascending: false })

  const residentsQuery = supabase
    .from('residents')
    .select('id, full_name, pay_day, fee, admission_date, status')
    .order('full_name')

  if (!showInactive) residentsQuery.eq('status', 'active')

  const [{ data: residents }, { data: extraChargesRaw }] = await Promise.all([
    residentsQuery,
    supabase.from('extra_charges').select('resident_id, billing_month, amount'),
  ])

  // Build map: residentId → billing_month → total extra charges
  const extraChargesMap: Record<string, Record<string, number>> = {}
  for (const ec of extraChargesRaw ?? []) {
    if (!ec.resident_id || !ec.billing_month) continue
    if (!extraChargesMap[ec.resident_id]) extraChargesMap[ec.resident_id] = {}
    extraChargesMap[ec.resident_id][ec.billing_month] =
      (extraChargesMap[ec.resident_id][ec.billing_month] ?? 0) + ec.amount
  }

  // Build toggle URL preserving current view
  const toggleParams = new URLSearchParams()
  if (view !== 'grid') toggleParams.set('view', view)
  if (!showInactive) toggleParams.set('show_inactive', '1')
  const toggleHref = `/payments${toggleParams.toString() ? '?' + toggleParams.toString() : ''}`

  // Build view-switch URLs preserving show_inactive
  function viewHref(v: string) {
    const p = new URLSearchParams()
    p.set('view', v)
    if (showInactive) p.set('show_inactive', '1')
    return `/payments?${p.toString()}`
  }

  return (
    <>
      <Header
        title="Payments"
        action={
          <div className="flex items-center gap-2">
            {/* Show/hide inactive toggle */}
            <Link href={toggleHref}>
              <button
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                  showInactive
                    ? 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100'
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                }`}
                title={showInactive ? 'Hide discharged residents' : 'Show discharged residents'}
              >
                {showInactive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                {showInactive ? 'Showing Inactive' : 'Show Inactive'}
              </button>
            </Link>

            {/* View toggle */}
            <div className="flex items-center rounded-lg border border-gray-200 bg-white overflow-hidden">
              <Link href={viewHref('grid')}>
                <button
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors ${
                    view === 'grid'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  Grid
                </button>
              </Link>
              <Link href={viewHref('list')}>
                <button
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors border-l border-gray-200 ${
                    view === 'list'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                  List
                </button>
              </Link>
            </div>

            <Link href="/payments/import">
              <Button size="sm" variant="outline">
                <Upload className="w-4 h-4" /> Import Statement
              </Button>
            </Link>
            <Link href="/payments/new">
              <Button size="sm">
                <Plus className="w-4 h-4" /> Add Payment
              </Button>
            </Link>
          </div>
        }
      />
      <main className="flex-1 p-6">
        {view === 'grid' ? (
          <PaymentsCalendar
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            residents={(residents ?? []).map((r: any) => ({
              id: r.id,
              full_name: r.full_name,
              pay_day: r.pay_day,
              fee: r.fee,
              admission_date: r.admission_date,
              status: r.status ?? 'active',
            }))}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            payments={(payments ?? []).map((p: any) => ({
              id: p.id,
              resident_id: p.resident_id,
              payment_date: p.payment_date,
              for_month: p.for_month ?? null,
              amount: p.amount,
              payment_method: p.payment_method,
              full_payment: p.full_payment ?? null,
            }))}
            extraChargesMap={extraChargesMap}
            highlightId={highlight}
          />
        ) : (
          <PaymentsTable
            payments={(payments ?? []).filter((p: any) =>
              showInactive ? true : (p.residents?.status !== 'discharged')
            )}
            isAdmin={isAdmin}
          />
        )}
      </main>
    </>
  )
}
