import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { PaymentForm } from '@/components/payments/PaymentForm'

export default async function NewPaymentPage({
  searchParams,
}: {
  searchParams?: { resident_id?: string; for_month?: string }
}) {
  const supabase = createClient()
  const preResidentId = searchParams?.resident_id ?? ''
  const preForMonth = searchParams?.for_month ?? ''

  const [{ data: residentsRaw }, { data: paymentsRaw }] = await Promise.all([
    supabase
      .from('residents')
      .select('id, full_name, fee, pay_day, admission_date')
      .eq('status', 'active')
      .order('full_name'),
    supabase
      .from('payments')
      .select('resident_id, for_month, payment_date, payer_name, payment_method')
      .order('payment_date', { ascending: false }),
  ])

  const residents = residentsRaw ?? []
  const payments = paymentsRaw ?? []

  // Current and last month as YYYY-MM
  const now = new Date()
  const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastYM = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`

  // Build per-resident hints
  type ResidentHint = {
    fee: number | null
    payerName: string | null
    paymentMethod: string | null
    suggestedForMonth: string
  }

  const hints: Record<string, ResidentHint> = {}

  for (const r of residents) {
    // Paid months for this resident
    const paidMonths = new Set(
      payments
        .filter(p => p.resident_id === r.id)
        .map(p => (p.for_month ?? p.payment_date?.slice(0, 7) ?? ''))
        .filter(Boolean)
    )

    // Most recent payment (payments are already ordered desc)
    const lastPayment = payments.find(p => p.resident_id === r.id)

    // Suggest for_month: use last month if it's unpaid, otherwise current month
    const suggestedForMonth = !paidMonths.has(lastYM) ? lastYM : currentYM

    hints[r.id] = {
      fee: r.fee ?? null,
      payerName: lastPayment?.payer_name ?? null,
      paymentMethod: lastPayment?.payment_method ?? null,
      // If for_month came from query param (grid + button), use that instead of auto-suggestion
      suggestedForMonth: (preForMonth && r.id === preResidentId) ? preForMonth : suggestedForMonth,
    }
  }

  return (
    <>
      <Header title="Payments" />
      <main className="flex-1 p-6">
        <div className="max-w-2xl mx-auto bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-5">Add Payment</h2>
          <PaymentForm
            residents={residents.map(r => ({ id: r.id, full_name: r.full_name }))}
            residentHints={hints}
            defaultResidentId={preResidentId}
          />
        </div>
      </main>
    </>
  )
}
