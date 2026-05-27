'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Car, ChevronRight, CheckCircle2, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { createDriverPayout, deleteDriverPayout } from '@/actions/driver-payouts'
import { computePeriodLabel } from './periodLabel'
import { MobileNav } from '@/components/layout/MobileNav'

interface Worker {
  id: string
  name: string
  nickname: string | null
}

interface Payout {
  id: string
  worker_id: string | null
  notes: string | null
  finalized: boolean
  created_at: string
  trip_count: number
  transport_total: number
  bill_total: number
  trip_dates: (string | null)[]
  worker: Worker | null
}

interface Props {
  payouts: Payout[]
  workers: Worker[]
}

function fmtRM(n: number) {
  return n.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function workerLabel(w: Worker) {
  return w.nickname ? `${w.nickname} (${w.name})` : w.name
}

function driverDisplay(w: Worker | null) {
  if (!w) return 'Unknown'
  return w.nickname ?? w.name
}

export function DriverPayoutList({ payouts, workers }: Props) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [workerId, setWorkerId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!workerId) { setError('Select a driver'); return }
    setSaving(true)
    setError('')
    try {
      const id = await createDriverPayout({ worker_id: workerId })
      setShowForm(false)
      setWorkerId('')
      router.push(`/driver-payouts/${id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this payout? All trips will also be removed.')) return
    setDeletingId(id)
    try {
      await deleteDriverPayout(id)
      router.refresh()
    } finally {
      setDeletingId(null)
    }
  }

  // Group payouts by driver display name
  const grouped = payouts.reduce<Record<string, Payout[]>>((acc, p) => {
    const key = driverDisplay(p.worker)
    ;(acc[key] ??= []).push(p)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MobileNav />
          <div>
            <h1 className="text-xl font-bold text-gray-900">Driver Payouts</h1>
            <p className="text-sm text-gray-500 mt-0.5">Track transport trips and calculate driver pay per period.</p>
          </div>
        </div>
        <Button onClick={() => setShowForm(v => !v)}>
          <Plus className="w-4 h-4" /> New Payout
        </Button>
      </div>

      {/* New payout form */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-white border border-gray-200 rounded-xl p-5 space-y-4 shadow-sm">
          <p className="font-semibold text-gray-800 text-sm">New Payout</p>
          <div className="max-w-xs">
            <Label htmlFor="worker_id">Driver *</Label>
            <select
              id="worker_id"
              value={workerId}
              onChange={e => setWorkerId(e.target.value)}
              className="w-full mt-1 px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            >
              <option value="">— Select driver —</option>
              {workers.map(w => (
                <option key={w.id} value={w.id}>{workerLabel(w)}</option>
              ))}
            </select>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3">
            <Button type="submit" disabled={saving}>{saving ? 'Creating…' : 'Create & Add Trips'}</Button>
            <Button type="button" variant="outline" onClick={() => { setShowForm(false); setError('') }}>Cancel</Button>
          </div>
        </form>
      )}

      {/* Payout list grouped by driver */}
      {payouts.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Car className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No payouts yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([driver, driverPayouts]) => (
            <div key={driver}>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">{driver}</h2>
              <div className="space-y-2">
                {driverPayouts.map(p => {
                  const total = p.transport_total + p.bill_total
                  const period = computePeriodLabel(p.trip_dates)
                  return (
                    <div
                      key={p.id}
                      className="bg-white border border-gray-200 rounded-xl px-4 py-3.5 flex items-center gap-4 hover:border-gray-300 hover:shadow-sm transition-all group"
                    >
                      <button
                        onClick={() => router.push(`/driver-payouts/${p.id}`)}
                        className="flex-1 flex items-center gap-4 text-left min-w-0"
                      >
                        <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                          <Car className="w-4 h-4 text-purple-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm">{period}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {p.trip_count} trip{p.trip_count !== 1 ? 's' : ''} · Transport RM {fmtRM(p.transport_total)} · Bill RM {fmtRM(p.bill_total)}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-bold text-gray-900">RM {fmtRM(total)}</p>
                          <div className="flex items-center justify-end gap-1 mt-0.5">
                            {p.finalized ? (
                              <span className="flex items-center gap-1 text-xs text-green-600">
                                <CheckCircle2 className="w-3 h-3" /> Finalized
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-xs text-amber-600">
                                <Clock className="w-3 h-3" /> Draft
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 group-hover:text-gray-600" />
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        disabled={deletingId === p.id}
                        className="p-1.5 rounded-md text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
                        title="Delete payout"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
