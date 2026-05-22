import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { PaymentForm } from '@/components/payments/PaymentForm'

interface Props {
  params: { id: string }
}

export default async function EditPaymentPage({ params }: Props) {
  const supabase = createClient()

  const [{ data: payment }, { data: residents }] = await Promise.all([
    supabase.from('payments').select('*').eq('id', params.id).single(),
    supabase.from('residents').select('id, full_name').eq('status', 'active').order('full_name'),
  ])

  if (!payment) notFound()

  return (
    <>
      <Header title="Payments" />
      <main className="flex-1 p-6">
        <div className="max-w-2xl mx-auto bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-5">Edit Payment</h2>
          <PaymentForm
            residents={residents ?? []}
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
            }}
          />
        </div>
      </main>
    </>
  )
}
