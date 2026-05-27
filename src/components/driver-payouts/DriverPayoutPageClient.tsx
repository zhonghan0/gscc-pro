'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { DriverPayoutList } from './DriverPayoutList'

interface Worker { id: string; name: string; nickname: string | null }
interface Payout {
  id: string; worker_id: string | null; notes: string | null; finalized: boolean
  created_at: string; trip_count: number; transport_total: number; bill_total: number
  trip_dates: (string | null)[]; worker: Worker | null
}

interface Props { payouts: Payout[]; workers: Worker[] }

export function DriverPayoutPageClient({ payouts, workers }: Props) {
  const [showForm, setShowForm] = useState(false)

  return (
    <>
      <Header
        title="Driver Payouts"
        action={
          <Button size="sm" onClick={() => setShowForm(v => !v)}>
            <Plus className="w-4 h-4" /> New Payout
          </Button>
        }
      />
      <main className="flex-1 p-6">
        <div className="max-w-3xl mx-auto">
          <DriverPayoutList
            payouts={payouts}
            workers={workers}
            showForm={showForm}
            setShowForm={setShowForm}
          />
        </div>
      </main>
    </>
  )
}
