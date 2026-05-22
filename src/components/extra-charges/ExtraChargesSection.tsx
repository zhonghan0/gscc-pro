'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Plus, Trash2, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AddExtraChargeForm } from './AddExtraChargeForm'
import { ResidentCustomPrices } from './ResidentCustomPrices'
import { deleteExtraCharge } from '@/actions/extra-charges'

interface ChargeItem {
  id: string
  name: string
  default_price: number
  unit: string | null
}

interface ResidentPrice {
  charge_item_id: string
  price: number
}

interface Charge {
  id: string
  charge_date: string
  description: string
  amount: number
  billing_month: string
}

interface Props {
  residentId: string
  residentFee: number
  chargeItems: ChargeItem[]
  residentPrices: ResidentPrice[]
  recentCharges: Charge[]
  isAdmin: boolean
  currentMonth: string
}

function fmtDate(d: string): string {
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

function fmtMonth(ym: string): string {
  const [y, m] = ym.split('-')
  return new Date(parseInt(y), parseInt(m) - 1, 1).toLocaleDateString('en-MY', { month: 'short', year: '2-digit' })
}

function DeleteChargeBtn({ chargeId, residentId }: { chargeId: string; residentId: string }) {
  const [confirm, setConfirm] = useState(false)
  const [, startTransition] = useTransition()

  if (!confirm) return (
    <button onClick={() => setConfirm(true)} className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors" title="Delete">
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  )
  return (
    <span className="flex items-center gap-1 text-xs">
      <button className="text-red-600 hover:underline font-medium" onClick={() => startTransition(() => deleteExtraCharge(chargeId, residentId))}>Yes</button>
      <span className="text-gray-300">·</span>
      <button className="text-gray-500 hover:underline" onClick={() => setConfirm(false)}>No</button>
    </span>
  )
}

export function ExtraChargesSection({
  residentId, residentFee, chargeItems, residentPrices, recentCharges, isAdmin, currentMonth
}: Props) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [showCustomPrices, setShowCustomPrices] = useState(false)

  // Group recent charges by billing month for display
  const byMonth = new Map<string, Charge[]>()
  for (const c of recentCharges) {
    const arr = byMonth.get(c.billing_month) ?? []
    arr.push(c)
    byMonth.set(c.billing_month, arr)
  }
  const months = Array.from(byMonth.keys()).sort().reverse().slice(0, 3)

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 text-base">Extra Charges</h3>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              onClick={() => setShowCustomPrices(p => !p)}
              className="text-xs text-gray-500 hover:text-gray-700 underline underline-offset-2"
            >
              {showCustomPrices ? 'Hide custom prices' : 'Custom prices'}
            </button>
          )}
          <Link href={`/residents/${residentId}/statement?month=${currentMonth}`} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium">
            <ExternalLink className="w-3 h-3" /> Statement
          </Link>
          <Button size="sm" onClick={() => setShowAddForm(true)} disabled={showAddForm}>
            <Plus className="w-4 h-4" /> Add Charge
          </Button>
        </div>
      </div>

      {/* Custom prices panel */}
      {showCustomPrices && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-blue-800 mb-3 uppercase tracking-wide">Custom Prices for this Resident</p>
          <ResidentCustomPrices
            residentId={residentId}
            chargeItems={chargeItems}
            residentPrices={residentPrices}
            isAdmin={isAdmin}
          />
        </div>
      )}

      {/* Add charge form */}
      {showAddForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h4 className="font-medium text-gray-900 mb-4">Add Extra Charge</h4>
          <AddExtraChargeForm
            residentId={residentId}
            chargeItems={chargeItems}
            residentPrices={residentPrices}
            defaultBillingMonth={currentMonth}
            onDone={() => setShowAddForm(false)}
          />
        </div>
      )}

      {/* Recent charges grouped by month */}
      {months.length === 0 && !showAddForm ? (
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-8 text-center text-sm text-gray-400">
          No extra charges recorded yet.
        </div>
      ) : (
        months.map(month => {
          const charges = byMonth.get(month)!
          const total = charges.reduce((s, c) => s + c.amount, 0)
          return (
            <div key={month} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Month header */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200">
                <span className="text-sm font-semibold text-gray-700">{fmtMonth(month)}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500">
                    Fee RM {residentFee.toFixed(2)} + extras RM {total.toFixed(2)} = <strong>RM {(residentFee + total).toFixed(2)}</strong>
                  </span>
                  <Link
                    href={`/residents/${residentId}/statement?month=${month}`}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" /> Statement
                  </Link>
                </div>
              </div>

              <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-100">
                  {charges.map(charge => (
                    <tr key={charge.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 text-gray-400 text-xs whitespace-nowrap w-24">{fmtDate(charge.charge_date)}</td>
                      <td className="px-4 py-2.5 text-gray-800">{charge.description}</td>
                      <td className="px-4 py-2.5 text-right font-medium text-gray-900 whitespace-nowrap">
                        RM {Number(charge.amount).toFixed(2)}
                      </td>
                      {isAdmin && (
                        <td className="px-3 py-2">
                          <DeleteChargeBtn chargeId={charge.id} residentId={residentId} />
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        })
      )}
    </div>
  )
}
