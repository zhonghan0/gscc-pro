import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { PaymentForm } from '@/components/payments/PaymentForm'
import { DeleteButton } from '@/components/ui/DeleteButton'
import { deletePayment } from '@/actions/payments'

interface Props {
  params: { id: string }
}

export default async function EditPaymentPage({ params }: Props) {
  const supabase = createClient()

  const [{ data: payment }, { data: residents }] = await Promise.all([
    supabase.from('payments').select('*').eq('id', params.id).single(),
    supabase.from('residents').select('id, full_name, fee').eq('status', 'active').order('full_name'),
  ])

  if (!payment) notFound()

  // Calculate expected amount for this billing month
  let expectedAmount: number | null = null
  if (payment.resident_id && payment.for_month) {
    const resident = residents?.find(r => r.id === payment.resident_id)
    const fee = (resident as { fee?: number | null } | undefined)?.fee ?? null
    if (fee !== null) {
      const { data: charges } = await supabase
        .from('extra_charges')
        .select('amount')
        .eq('resident_id', payment.resident_id)
        .eq('billing_month', payment.for_month)
      const extrasTotal = (charges ?? []).reduce((s, c) => s + c.amount, 0)
      expectedAmount = fee + extrasTotal
    }
  }

  return (
    <>
      <Header title="Payments" />
      <main className="flex-1 p-6">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-5">Edit Payment</h2>
            <PaymentForm
              residents={residents ?? []}
              expectedAmount={expectedAmount}
              payment={{
                id: payment.id,
                resident_id: payment.resident_id,
                payment_date: payment.payment_date,
                amount: payment.amount,
                payment_method: payment.payment_method,
                payer_name: payment.payer_name,
                reference: payment.reference,
                description: payment.description,
                notes: payment.notes,
                for_month: payment.for_month,
                full_payment: payment.full_payment ?? null,
              }}
            />
          </div>

          {/* Danger zone */}
          <div className="bg-white rounded-xl border border-red-200 p-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-gray-900">Delete Payment</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Permanently removes this payment record. This cannot be undone.
              </p>
            </div>
            <DeleteButton
              label="this payment"
              action={async () => { 'use server'; await deletePayment(payment.id) }}
            />
          </div>
        </div>
      </main>
    </>
  )
}
